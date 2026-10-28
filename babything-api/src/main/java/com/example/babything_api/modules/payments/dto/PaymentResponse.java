package com.example.babything_api.modules.payments.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.example.babything_api.modules.orders.entity.OrderStatus;
import com.example.babything_api.modules.payments.entity.Payment;
import com.example.babything_api.modules.payments.entity.PaymentMethod;
import com.example.babything_api.modules.payments.entity.PaymentStatus;

/**
 * Dùng cho cả danh sách và chi tiết. order là tóm tắt đơn để hiển thị, chi tiết đầy đủ xem /api/orders/{id}.
 * payer là người mua (chính người xem, hoặc để admin đối soát). Không trả providerTxnId: mã nội bộ của cổng
 * thanh toán chỉ dùng để đối soát.
 */
public record PaymentResponse(
        Long id,
        String transactionRef,
        BigDecimal amount,
        PaymentMethod method,
        PaymentStatus status,
        String provider,
        String failureReason,
        Payer payer,
        OrderSummary order,
        Instant expiresAt,
        Instant paidAt,
        Instant refundedAt,
        Instant createdAt,
        Instant updatedAt) {

    /** seller null khi tin đăng không còn người bán. */
    public record OrderSummary(Long id, OrderStatus status, Seller seller, String firstItemName,
            String firstItemImageUrl, int itemCount) {
    }

    public record Seller(Long id, String displayName) {
    }

    public record Payer(Long id, String displayName, String email) {
    }

    /** Gọi trong transaction: user, order, seller và items là quan hệ lazy. */
    public static PaymentResponse from(Payment p) {
        var o = p.getOrder();
        var s = o.getSeller();
        var u = p.getUser();
        var first = o.getItems().isEmpty() ? null : o.getItems().get(0);
        var order = new OrderSummary(o.getId(), o.getStatus(),
                s == null ? null : new Seller(s.getId(), s.getDisplayName()),
                first == null ? null : first.getProductName(),
                first == null ? null : first.getImageUrl(),
                o.getItems().size());
        return new PaymentResponse(p.getId(), p.getTransactionRef(), p.getAmount(), p.getMethod(), p.getStatus(),
                p.getProvider(), p.getFailureReason(), new Payer(u.getId(), u.getDisplayName(), u.getEmail()), order,
                p.getExpiresAt(), p.getPaidAt(), p.getRefundedAt(), p.getCreatedAt(), p.getUpdatedAt());
    }
}
