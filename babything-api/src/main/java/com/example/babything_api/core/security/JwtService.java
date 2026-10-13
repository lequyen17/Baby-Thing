package com.example.babything_api.core.security;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import com.example.babything_api.config.AppProperties;
import com.example.babything_api.modules.users.entity.User;

@Service
public class JwtService {

    private final SecretKey key;
    private final AppProperties props;

    public JwtService(AppProperties props) {
        this.props = props;
        String secret = props.jwt().secret();
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 bytes long");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public record AccessToken(String value, String jti, Instant expiresAt) {
    }

    public AccessToken issue(User user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(props.jwt().accessTtl());
        String jti = UUID.randomUUID().toString();
        String value = Jwts.builder()
                .subject(user.getId().toString())
                .id(jti)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .signWith(key)
                .compact();
        return new AccessToken(value, jti, expiresAt);
    }

    /** Ném JwtException nếu chữ ký sai hoặc token đã hết hạn. */
    public Claims parse(String token) throws JwtException {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
