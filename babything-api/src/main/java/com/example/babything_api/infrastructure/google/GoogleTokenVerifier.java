package com.example.babything_api.infrastructure.google;

import java.util.List;
import java.util.Set;
import java.util.function.Predicate;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

import com.example.babything_api.config.AppProperties;
import com.example.babything_api.core.exceptions.ApiException;

/**
 * Xác thực ID token (credential) mà Google Identity Services trả cho frontend:
 * chữ ký theo JWKS của Google (Nimbus tự cache key), iss, aud = client id của app, exp.
 */
@Component
public class GoogleTokenVerifier {

    private static final Logger log = LoggerFactory.getLogger(GoogleTokenVerifier.class);

    private static final String JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
    private static final Set<String> ISSUERS = Set.of("accounts.google.com", "https://accounts.google.com");

    private final AppProperties props;
    private final JwtDecoder decoder;

    public GoogleTokenVerifier(AppProperties props) {
        this.props = props;
        NimbusJwtDecoder nimbus = NimbusJwtDecoder.withJwkSetUri(JWKS_URI).build();
        nimbus.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefault(),
                claim("iss", jwt -> ISSUERS.contains(jwt.getClaimAsString("iss"))),
                claim("aud", jwt -> {
                    List<String> aud = jwt.getAudience();
                    return aud != null && aud.contains(props.google().clientId());
                })));
        this.decoder = nimbus;
    }

    public GoogleProfile verify(String idToken) {
        if (!props.google().enabled()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "GOOGLE_DISABLED",
                    "Google sign-in is not enabled");
        }
        Jwt jwt;
        try {
            jwt = decoder.decode(idToken);
        } catch (JwtException e) {
            log.debug("Rejected Google ID token: {}", e.getMessage());
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_GOOGLE_TOKEN",
                    "Google sign-in failed, please try again");
        }
        return new GoogleProfile(
                jwt.getSubject(),
                jwt.getClaimAsString("email"),
                Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified")),
                jwt.getClaimAsString("name"),
                jwt.getClaimAsString("picture"));
    }

    private static OAuth2TokenValidator<Jwt> claim(String name, Predicate<Jwt> test) {
        return jwt -> test.test(jwt)
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Invalid " + name, null));
    }

    public record GoogleProfile(String sub, String email, boolean emailVerified, String name, String picture) {
    }
}
