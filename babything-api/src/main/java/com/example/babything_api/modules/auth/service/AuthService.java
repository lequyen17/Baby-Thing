package com.example.babything_api.modules.auth.service;

import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.babything_api.config.AppProperties;
import com.example.babything_api.core.exceptions.ApiException;
import com.example.babything_api.core.security.AccessTokenBlacklist;
import com.example.babything_api.core.security.AuthPrincipal;
import com.example.babything_api.core.security.JwtService;
import com.example.babything_api.core.utils.Tokens;
import com.example.babything_api.infrastructure.cache.RateLimiter;
import com.example.babything_api.infrastructure.email.MailService;
import com.example.babything_api.infrastructure.google.GoogleTokenVerifier;
import com.example.babything_api.infrastructure.google.GoogleTokenVerifier.GoogleProfile;
import com.example.babything_api.modules.auth.dto.ChangePasswordRequest;
import com.example.babything_api.modules.auth.dto.GoogleConfigResponse;
import com.example.babything_api.modules.auth.dto.LoginChallengeResponse;
import com.example.babything_api.modules.auth.dto.AuthSession;
import com.example.babything_api.modules.auth.dto.LoginRequest;
import com.example.babything_api.modules.auth.dto.LoginResponse;
import com.example.babything_api.modules.auth.dto.LoginResult;
import com.example.babything_api.modules.auth.dto.RegisterRequest;
import com.example.babything_api.modules.auth.dto.ResetPasswordRequest;
import com.example.babything_api.modules.auth.dto.TokenResponse;
import com.example.babything_api.modules.auth.entity.RefreshToken;
import com.example.babything_api.modules.auth.entity.UserIdentity;
import com.example.babything_api.modules.auth.repository.RefreshTokenRepository;
import com.example.babything_api.modules.auth.repository.UserIdentityRepository;
import com.example.babything_api.modules.users.entity.User;
import com.example.babything_api.modules.users.entity.UserStatus;
import com.example.babything_api.modules.users.repository.UserRepository;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private static final String PURPOSE_REGISTER = "reg";
    private static final String PURPOSE_LOGIN = "login";

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserIdentityRepository identityRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AccessTokenBlacklist blacklist;
    private final OtpService otpService;
    private final MailService mailService;
    private final RateLimiter rateLimiter;
    private final StringRedisTemplate redis;
    private final GoogleTokenVerifier googleVerifier;
    private final AppProperties props;

    public AuthService(UserRepository userRepository, RefreshTokenRepository refreshTokenRepository,
            UserIdentityRepository identityRepository, PasswordEncoder passwordEncoder, JwtService jwtService,
            AccessTokenBlacklist blacklist, OtpService otpService, MailService mailService,
            RateLimiter rateLimiter, StringRedisTemplate redis, GoogleTokenVerifier googleVerifier,
            AppProperties props) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.identityRepository = identityRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.blacklist = blacklist;
        this.otpService = otpService;
        this.mailService = mailService;
        this.rateLimiter = rateLimiter;
        this.redis = redis;
        this.googleVerifier = googleVerifier;
        this.props = props;
    }

    // ---------------------------------------------------------------- Đăng ký

    public void register(RegisterRequest req, String ip) {
        String email = normalizeEmail(req.email());
        rateLimiter.check(ip, "register", 10);
        rateLimiter.check(email, "register", 3);
        if (userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_EXISTS", "Email is already registered");
        }
        otpService.ensureNoCooldown(PURPOSE_REGISTER, email);

        String displayName = req.displayName().trim();
        String otp = otpService.create(regKey(email), Map.of(
                "display_name", displayName,
                "password", passwordEncoder.encode(req.password())));
        mailService.sendRegistrationOtp(email, displayName, otp);
        otpService.startCooldown(PURPOSE_REGISTER, email);
    }

    public void resendRegisterOtp(String rawEmail, String ip) {
        String email = normalizeEmail(rawEmail);
        rateLimiter.check(ip, "register-resend", 10);
        Map<String, String> pending = otpService.find(regKey(email));
        if (pending.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "REGISTRATION_EXPIRED",
                    "Registration session has expired, please register again");
        }
        otpService.ensureNoCooldown(PURPOSE_REGISTER, email);
        String otp = otpService.regenerate(regKey(email));
        mailService.sendRegistrationOtp(email, pending.get("display_name"), otp);
        otpService.startCooldown(PURPOSE_REGISTER, email);
    }

    @Transactional
    public AuthSession verifyRegister(String rawEmail, String otp, String ip) {
        String email = normalizeEmail(rawEmail);
        rateLimiter.check(ip, "register-verify", 20);
        Map<String, String> pending = otpService.verify(regKey(email), otp);
        if (userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_EXISTS", "Email is already registered");
        }
        Instant now = Instant.now();
        User user = new User();
        user.setEmail(email);
        user.setPassword(pending.get("password"));
        user.setDisplayName(pending.get("display_name"));
        user.setEmailVerifiedAt(now);
        user.setLastLoginAt(now);
        userRepository.save(user);
        return issueTokens(user, UUID.randomUUID(), now);
    }

    // ---------------------------------------------------------------- Đăng nhập (mật khẩu + OTP email)

    public LoginResult login(LoginRequest req, String ip) {
        String email = normalizeEmail(req.email());
        rateLimiter.check(ip, "login", 20);

        String failKey = "login_fail:" + email;
        String failures = redis.opsForValue().get(failKey);
        if (failures != null && Integer.parseInt(failures) >= props.login().maxFailures()) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "LOGIN_LOCKED",
                    "Too many failed attempts, please try again in "
                            + props.login().lockDuration().toMinutes() + " minutes");
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || !passwordEncoder.matches(req.password(), user.getPassword())) {
            Long count = redis.opsForValue().increment(failKey);
            if (count != null && count == 1) {
                redis.expire(failKey, props.login().lockDuration());
            }
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid email or password");
        }
        ensureActive(user);
        redis.delete(failKey);

        if (!props.login().otpEnabled()) {
            Instant now = Instant.now();
            user.setLastLoginAt(now);
            userRepository.save(user);
            return LoginResult.authenticated(issueTokens(user, UUID.randomUUID(), now));
        }

        String challengeId = UUID.randomUUID().toString();
        String otp = otpService.create(challengeKey(challengeId), Map.of("user_id", user.getId().toString()));
        mailService.sendLoginOtp(user.getEmail(), user.getDisplayName(), otp);
        otpService.startCooldown(PURPOSE_LOGIN, challengeId);
        return LoginResult.challenge(
                new LoginChallengeResponse(challengeId, user.getEmail(), props.otp().ttl().toSeconds()));
    }

    public void resendLoginOtp(String challengeId, String ip) {
        rateLimiter.check(ip, "login-resend", 10);
        Map<String, String> challenge = otpService.find(challengeKey(challengeId));
        if (challenge.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CHALLENGE_EXPIRED",
                    "Verification session has expired, please sign in again");
        }
        otpService.ensureNoCooldown(PURPOSE_LOGIN, challengeId);
        User user = userRepository.findById(Long.valueOf(challenge.get("user_id")))
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "CHALLENGE_EXPIRED",
                        "Verification session has expired, please sign in again"));
        String otp = otpService.regenerate(challengeKey(challengeId));
        mailService.sendLoginOtp(user.getEmail(), user.getDisplayName(), otp);
        otpService.startCooldown(PURPOSE_LOGIN, challengeId);
    }

    @Transactional
    public AuthSession verifyLogin(String challengeId, String otp, String ip) {
        rateLimiter.check(ip, "login-verify", 20);
        Map<String, String> challenge = otpService.verify(challengeKey(challengeId), otp);
        User user = userRepository.findById(Long.valueOf(challenge.get("user_id")))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
                        "Account not found"));
        ensureActive(user);
        Instant now = Instant.now();
        user.setLastLoginAt(now);
        return issueTokens(user, UUID.randomUUID(), now);
    }

    // ---------------------------------------------------------------- Đăng nhập Google

    /**
     * Google đã xác thực người dùng nên bỏ qua bước OTP email.
     * Thứ tự tìm tài khoản: theo Google sub đã liên kết -> theo email (tự liên kết) -> tạo tài khoản mới.
     */
    @Transactional
    public AuthSession loginWithGoogle(String credential, String ip) {
        rateLimiter.check(ip, "login-google", 20);
        GoogleProfile profile = googleVerifier.verify(credential);
        Instant now = Instant.now();

        User user = identityRepository.findByProviderAndProviderUserId(UserIdentity.Provider.GOOGLE, profile.sub())
                .map(identity -> {
                    identity.setProviderEmail(profile.email());
                    return identity.getUser();
                })
                .orElseGet(() -> linkOrCreateGoogleUser(profile, now));
        ensureActive(user);

        if (user.getAvatarUrl() == null && profile.picture() != null && profile.picture().length() <= 500) {
            user.setAvatarUrl(profile.picture());
        }
        user.setLastLoginAt(now);
        userRepository.save(user);
        return issueTokens(user, UUID.randomUUID(), now);
    }

    public GoogleConfigResponse googleConfig() {
        AppProperties.Google google = props.google();
        return new GoogleConfigResponse(google.enabled(), google.enabled() ? google.clientId() : null);
    }

    private User linkOrCreateGoogleUser(GoogleProfile profile, Instant now) {
        // Chỉ tin email Google đã xác minh, nếu không ai cũng có thể chiếm tài khoản theo email
        if (profile.email() == null || !profile.emailVerified()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "GOOGLE_EMAIL_UNVERIFIED",
                    "Your Google account email is not verified");
        }
        String email = normalizeEmail(profile.email());
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            user = new User();
            user.setEmail(email);
            user.setDisplayName(googleDisplayName(profile, email));
            user.setEmailVerifiedAt(now);
            userRepository.save(user);
        } else {
            if (identityRepository.existsByUserIdAndProvider(user.getId(), UserIdentity.Provider.GOOGLE)) {
                throw new ApiException(HttpStatus.CONFLICT, "GOOGLE_ACCOUNT_MISMATCH",
                        "This email is already linked to a different Google account");
            }
            if (user.getEmailVerifiedAt() == null) {
                user.setEmailVerifiedAt(now);
            }
        }
        identityRepository.save(new UserIdentity(user, UserIdentity.Provider.GOOGLE, profile.sub(), profile.email()));
        return user;
    }

    private static String googleDisplayName(GoogleProfile profile, String email) {
        String name = profile.name() == null ? "" : profile.name().trim();
        if (name.isEmpty()) {
            name = email.substring(0, email.indexOf('@'));
        }
        return name.length() > 50 ? name.substring(0, 50) : name;
    }

    // ---------------------------------------------------------------- Refresh token rotation

    /**
     * Rotate: token cũ được đánh dấu replaced_by_id + revoked_at, token mới là dòng mới cùng family_id.
     * Không rollback khi ném lỗi để việc thu hồi family (phát hiện dùng lại token) vẫn được lưu.
     */
    @Transactional(noRollbackFor = ApiException.class)
    public AuthSession refresh(String tokenValue) {
        RefreshToken current = loadRefreshTokenForUpdate(tokenValue);
        Instant now = Instant.now();

        if (current.isUsedOrRevoked()) {
            // Token đã dùng rồi mà vẫn bị gửi lại -> có thể bị đánh cắp, thu hồi cả family
            refreshTokenRepository.revokeFamily(current.getFamilyId(), now);
            log.warn("Refresh token reuse detected, revoked family {} of user {}",
                    current.getFamilyId(), current.getUser().getId());
            throw invalidRefreshToken();
        }
        if (current.isExpired(now)) {
            throw invalidRefreshToken();
        }
        Instant sessionStartedAt = refreshTokenRepository.findFamilyStartedAt(current.getFamilyId());
        if (!sessionStartedAt.plus(props.jwt().sessionMaxAge()).isAfter(now)) {
            refreshTokenRepository.revokeFamily(current.getFamilyId(), now);
            throw invalidRefreshToken();
        }
        User user = current.getUser();
        if (user.getStatus() != UserStatus.ACTIVE) {
            refreshTokenRepository.revokeFamily(current.getFamilyId(), now);
            ensureActive(user);
        }

        IssuedRefreshToken next = createRefreshToken(user, current.getFamilyId(), now, sessionStartedAt);
        current.setReplacedById(next.entity().getId());
        current.setRevokedAt(now);
        return buildTokenResponse(user, next);
    }

    // ---------------------------------------------------------------- Logout

    @Transactional
    public void logout(AuthPrincipal principal, String refreshToken) {
        if (principal != null) {
            blacklist.add(principal.jti(), principal.accessExpiresAt());
        }
        if (refreshToken != null && !refreshToken.isBlank()) {
            findStoredRefreshToken(refreshToken)
                    .ifPresent(t -> refreshTokenRepository.revokeFamily(t.getFamilyId(), Instant.now()));
        }
    }

    // ---------------------------------------------------------------- Mật khẩu

    /** Đổi mật khẩu -> thu hồi mọi phiên, cấp phiên mới cho thiết bị hiện tại. */
    @Transactional
    public AuthSession changePassword(AuthPrincipal principal, ChangePasswordRequest req) {
        rateLimiter.check("user-" + principal.user().getId(), "change-password", 5);
        User user = userRepository.findById(principal.user().getId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required"));
        if (user.getPassword() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PASSWORD_NOT_SET",
                    "This account signs in with Google and has no password yet. Use Forgot password to set one");
        }
        if (!passwordEncoder.matches(req.currentPassword(), user.getPassword())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CURRENT_PASSWORD", "Current password is incorrect");
        }
        if (passwordEncoder.matches(req.newPassword(), user.getPassword())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SAME_PASSWORD", "New password must be different from the current one");
        }
        Instant now = Instant.now();
        updatePassword(user, req.newPassword(), now);
        blacklist.add(principal.jti(), principal.accessExpiresAt());
        return issueTokens(user, UUID.randomUUID(), now);
    }

    /** Luôn trả về thành công để không lộ email nào đã đăng ký. */
    public void forgotPassword(String rawEmail, String ip) {
        String email = normalizeEmail(rawEmail);
        rateLimiter.check(ip, "forgot-password", 10);
        rateLimiter.check(email, "forgot-password", 3);
        userRepository.findByEmail(email)
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .ifPresent(user -> {
                    String token = Tokens.random(32);
                    redis.opsForValue().set(resetKey(token), user.getId().toString(), props.passwordReset().ttl());
                    String link = props.frontendUrl() + "/reset-password?token=" + token;
                    mailService.sendPasswordReset(user.getEmail(), user.getDisplayName(), link);
                });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req, String ip) {
        rateLimiter.check(ip, "reset-password", 10);
        String userId = redis.opsForValue().getAndDelete(resetKey(req.token()));
        if (userId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "RESET_TOKEN_INVALID",
                    "Password reset link is invalid or has expired");
        }
        User user = userRepository.findById(Long.valueOf(userId))
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "RESET_TOKEN_INVALID",
                        "Password reset link is invalid or has expired"));
        updatePassword(user, req.newPassword(), Instant.now());
        redis.delete("login_fail:" + user.getEmail());
    }

    // ---------------------------------------------------------------- Helpers

    private void updatePassword(User user, String rawPassword, Instant now) {
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setPasswordChangedAt(now);
        userRepository.save(user);
        refreshTokenRepository.revokeAllForUser(user.getId(), now);
    }

    private AuthSession issueTokens(User user, UUID familyId, Instant now) {
        IssuedRefreshToken issued = createRefreshToken(user, familyId, now, now);
        return buildTokenResponse(user, issued);
    }

    /** Hạn của token mới không vượt quá hạn tối đa của cả phiên (tính từ token đầu tiên trong family). */
    private IssuedRefreshToken createRefreshToken(User user, UUID familyId, Instant now, Instant sessionStartedAt) {
        Instant expiresAt = now.plus(props.jwt().refreshTtl());
        Instant sessionEnd = sessionStartedAt.plus(props.jwt().sessionMaxAge());
        if (expiresAt.isAfter(sessionEnd)) {
            expiresAt = sessionEnd;
        }
        String plain = Tokens.random(32);
        RefreshToken saved = refreshTokenRepository.saveAndFlush(
                new RefreshToken(user, hashRefreshToken(plain), familyId, expiresAt));
        return new IssuedRefreshToken(saved, plain);
    }

    private AuthSession buildTokenResponse(User user, IssuedRefreshToken refreshToken) {
        JwtService.AccessToken access = jwtService.issue(user);
        TokenResponse body = new TokenResponse(access.value(), "Bearer", props.jwt().accessTtl().toSeconds());
        return new AuthSession(body, refreshToken.plainValue());
    }

    private RefreshToken loadRefreshTokenForUpdate(String plainToken) {
        return refreshTokenRepository.findByTokenHashForUpdate(hashRefreshToken(plainToken))
                .orElseThrow(AuthService::invalidRefreshToken);
    }

    private Optional<RefreshToken> findStoredRefreshToken(String plainToken) {
        return refreshTokenRepository.findByTokenHash(hashRefreshToken(plainToken));
    }

    private static String hashRefreshToken(String plainToken) {
        return Tokens.sha256(plainToken);
    }

    private record IssuedRefreshToken(RefreshToken entity, String plainValue) {
    }

    private static void ensureActive(User user) {
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_LOCKED", "Account is locked");
        }
    }

    private static ApiException invalidRefreshToken() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN",
                "Session has expired, please sign in again");
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String regKey(String email) {
        return "reg_otp:" + email;
    }

    private static String challengeKey(String challengeId) {
        return "mfa_challenge:" + challengeId;
    }

    private static String resetKey(String token) {
        return "pwd_reset:" + Tokens.sha256(token);
    }
}
