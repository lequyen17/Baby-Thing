package com.example.babything_api.config;

import java.math.BigDecimal;
import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String frontendUrl,
        boolean cookieSecure,
        Mail mail,
        Jwt jwt,
        Otp otp,
        PasswordReset passwordReset,
        Login login,
        @DefaultValue Google google,
        @DefaultValue R2 r2,
        @DefaultValue Uploads uploads,
        @DefaultValue Marketplace marketplace) {

    public record Mail(String from, boolean enabled) {
    }

    /**
     * commissionRate: hoa hồng trừ vào tiền người bán nhận. paymentWindow: đơn chưa thanh toán quá hạn này thì tự huỷ.
     * paymentTtl: thời hạn của một lần thanh toán. inspectionPeriod: người mua không xác nhận / khiếu nại thì tự hoàn tất.
     */
    public record Marketplace(
            @DefaultValue("0.10") BigDecimal commissionRate,
            @DefaultValue("30m") Duration paymentWindow,
            @DefaultValue("15m") Duration paymentTtl,
            @DefaultValue("48h") Duration inspectionPeriod) {
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

    /** Thư mục lưu ảnh tải lên khi chưa cấu hình R2. */
    public record Uploads(@DefaultValue("uploads") String dir) {
    }

    /** Thiếu bất kỳ trường bắt buộc nào = không dùng R2, ảnh được lưu vào Uploads.dir. */
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
