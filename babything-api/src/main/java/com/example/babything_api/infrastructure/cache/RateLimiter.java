package com.example.babything_api.infrastructure.cache;

import java.time.Duration;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import com.example.babything_api.core.exceptions.ApiException;

/** Fixed window theo key rate:{ip|email}:{endpoint}, cửa sổ 1 phút. */
@Component
public class RateLimiter {

    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final StringRedisTemplate redis;

    public RateLimiter(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public void check(String subject, String endpoint, int limit) {
        String key = "rate:" + subject + ":" + endpoint;
        Long count = redis.opsForValue().increment(key);
        if (count != null && count == 1) {
            redis.expire(key, WINDOW);
        }
        if (count != null && count > limit) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED",
                    "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút");
        }
    }
}
