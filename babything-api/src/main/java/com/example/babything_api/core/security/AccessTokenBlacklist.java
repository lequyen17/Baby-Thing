package com.example.babything_api.core.security;

import java.time.Duration;
import java.time.Instant;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/** access_blacklist:{jti} -> "1", TTL = thời gian còn lại của access token. */
@Component
public class AccessTokenBlacklist {

    private final StringRedisTemplate redis;

    public AccessTokenBlacklist(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public void add(String jti, Instant expiresAt) {
        Duration ttl = Duration.between(Instant.now(), expiresAt);
        if (!ttl.isNegative() && !ttl.isZero()) {
            redis.opsForValue().set(key(jti), "1", ttl);
        }
    }

    public boolean contains(String jti) {
        return Boolean.TRUE.equals(redis.hasKey(key(jti)));
    }

    private static String key(String jti) {
        return "access_blacklist:" + jti;
    }
}
