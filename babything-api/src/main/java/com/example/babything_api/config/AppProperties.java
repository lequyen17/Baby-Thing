package com.example.babything_api.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String frontendUrl,
        Mail mail,
        Jwt jwt,
        Otp otp,
        PasswordReset passwordReset,
        Login login,
        @DefaultValue Google google,
        @DefaultValue R2 r2) {

    public record Mail(String from, boolean enabled) {
    }

    public record Jwt(String secret, Duration accessTtl, Duration refreshTtl, Duration sessionMaxAge) {
    }

    public record Otp(Duration ttl, int maxAttempts, Duration resendCooldown) {
    }

    public record PasswordReset(Duration ttl) {
    }

    /** otpEnabled = false: đăng nhập chỉ cần mật khẩu, bỏ bước OTP email. */
    public record Login(int maxFailures, Duration lockDuration, boolean otpEnabled) {
    }

    /** clientId rỗng = tắt đăng nhập Google. */
    public record Google(String clientId) {

        public boolean enabled() {
            return clientId != null && !clientId.isBlank();
        }
    }

    /** Thiếu bất kỳ trường bắt buộc nào = tắt upload avatar lên R2. */
    public record R2(String accountId, String accessKeyId, String secretAccessKey, String bucketName,
            String publicBaseUrl) {

        public boolean enabled() {
            return accountId != null && !accountId.isBlank()
                    && accessKeyId != null && !accessKeyId.isBlank()
                    && secretAccessKey != null && !secretAccessKey.isBlank()
                    && bucketName != null && !bucketName.isBlank()
                    && publicBaseUrl != null && !publicBaseUrl.isBlank();
        }
    }
}
