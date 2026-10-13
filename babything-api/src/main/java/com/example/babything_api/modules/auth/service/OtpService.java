package com.example.babything_api.modules.auth.service;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.example.babything_api.config.AppProperties;
import com.example.babything_api.core.exceptions.ApiException;
import com.example.babything_api.core.utils.Tokens;

/**
 * Lưu OTP dạng Redis hash: {otp_hash, attempts, ...các field riêng của từng luồng}.
 * Dùng chung cho reg_otp:{email} và mfa_challenge:{challengeId}.
 */
@Service
public class OtpService {

    private static final String OTP_HASH = "otp_hash";
    private static final String ATTEMPTS = "attempts";

    private final StringRedisTemplate redis;
    private final AppProperties props;

    public OtpService(StringRedisTemplate redis, AppProperties props) {
        this.redis = redis;
        this.props = props;
    }

    /** Tạo (hoặc ghi đè) bản ghi OTP mới, trả về mã OTP gốc để gửi mail. */
    public String create(String key, Map<String, String> extraFields) {
        String otp = Tokens.otp();
        Map<String, String> fields = new HashMap<>(extraFields);
        fields.put(OTP_HASH, Tokens.sha256(otp));
        fields.put(ATTEMPTS, "0");
        redis.delete(key);
        redis.opsForHash().putAll(key, fields);
        redis.expire(key, props.otp().ttl());
        return otp;
    }

    /** Sinh OTP mới cho bản ghi đang tồn tại (gửi lại mã), reset số lần thử và TTL. */
    public String regenerate(String key) {
        String otp = Tokens.otp();
        redis.opsForHash().putAll(key, Map.of(OTP_HASH, Tokens.sha256(otp), ATTEMPTS, "0"));
        redis.expire(key, props.otp().ttl());
        return otp;
    }

    public Map<String, String> find(String key) {
        Map<Object, Object> raw = redis.opsForHash().entries(key);
        Map<String, String> result = new HashMap<>();
        raw.forEach((k, v) -> result.put(k.toString(), v.toString()));
        return result;
    }

    /** Kiểm tra OTP; đúng thì xoá key và trả về các field, sai thì tăng số lần thử. */
    public Map<String, String> verify(String key, String otp) {
        Map<String, String> fields = find(key);
        if (fields.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP_EXPIRED", "Verification code has expired, please request a new one");
        }
        long attempts = redis.opsForHash().increment(key, ATTEMPTS, 1);
        if (attempts > props.otp().maxAttempts()) {
            redis.delete(key);
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_TOO_MANY_ATTEMPTS",
                    "Too many incorrect attempts, please start over");
        }
        if (!Tokens.equalsConstantTime(fields.get(OTP_HASH), Tokens.sha256(otp))) {
            long remaining = props.otp().maxAttempts() - attempts;
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP_INVALID",
                    "Incorrect verification code, " + remaining + " attempt(s) left");
        }
        redis.delete(key);
        return fields;
    }

    /** otp_cooldown:{purpose}:{id} - chặn gửi mã liên tục. */
    public void ensureNoCooldown(String purpose, String id) {
        Long ttl = redis.getExpire(cooldownKey(purpose, id));
        if (ttl != null && ttl > 0) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_COOLDOWN",
                    "Please wait " + ttl + " seconds before requesting a new code");
        }
    }

    public void startCooldown(String purpose, String id) {
        Duration cooldown = props.otp().resendCooldown();
        redis.opsForValue().set(cooldownKey(purpose, id), "1", cooldown);
    }

    private static String cooldownKey(String purpose, String id) {
        return "otp_cooldown:" + purpose + ":" + id;
    }
}
