package com.example.babything_api.core.security;

import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import com.example.babything_api.modules.users.entity.User;
import com.example.babything_api.modules.users.entity.UserStatus;
import com.example.babything_api.modules.users.repository.UserRepository;

/**
 * Đọc "Authorization: Bearer ..." và gắn principal nếu token hợp lệ.
 * Token không hợp lệ thì bỏ qua, endpoint cần đăng nhập sẽ trả 401.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final AccessTokenBlacklist blacklist;
    private final UserRepository userRepository;

    public JwtAuthFilter(JwtService jwtService, AccessTokenBlacklist blacklist, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.blacklist = blacklist;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith("Bearer ")) {
            authenticate(header.substring(7));
        }
        chain.doFilter(request, response);
    }

    private void authenticate(String token) {
        Claims claims;
        try {
            claims = jwtService.parse(token);
        } catch (JwtException | IllegalArgumentException e) {
            return;
        }
        if (blacklist.contains(claims.getId())) {
            return;
        }
        User user = userRepository.findById(Long.valueOf(claims.getSubject())).orElse(null);
        if (user == null || user.getStatus() != UserStatus.ACTIVE) {
            return;
        }
        // Đổi mật khẩu -> mọi access token phát hành trước đó mất hiệu lực (iat chỉ chính xác tới giây)
        Instant issuedAt = claims.getIssuedAt().toInstant();
        Instant changedAt = user.getPasswordChangedAt();
        if (changedAt != null && issuedAt.isBefore(changedAt.truncatedTo(ChronoUnit.SECONDS))) {
            return;
        }
        AuthPrincipal principal = new AuthPrincipal(user, claims.getId(), claims.getExpiration().toInstant());
        var authentication = new UsernamePasswordAuthenticationToken(
                principal, null, List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
