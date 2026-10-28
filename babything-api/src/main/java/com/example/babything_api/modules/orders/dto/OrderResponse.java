package com.example.babything_api.modules.orders.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.example.babything_api.modules.orders.entity.Order;
import com.example.babything_api.modules.orders.entity.OrderStatus;

/**
 * Dùng cho cả danh sách và chi tiết; danh sách cũng trả items để hiển thị tóm tắt.
 * seller null khi tin đăng không còn người bán. customer.email chỉ có khi người xem là chính người mua hoặc admin.
 * inspectionEndsAt: hết mốc này mà người mua chưa xác nhận thì đơn tự hoàn tất (chỉ có khi DELIVERED).
 * care = đơn hàng BabyThings Care, do Baby Things xác nhận và giao từ kho ký gửi.
 */
public record OrderResponse(
        Long id,
        OrderStatus status,
        boolean care,
        Customer customer,
        Seller seller,
        String recipientName,
        String phone,
        String address,
        String note,
        BigDecimal totalAmount,
        int totalQuantity,
        List<OrderItemResponse> items,
        String trackingCode,
        String cancelReason,
        Instant cancelledAt,
        Instant paymentDueAt,
        Instant paidAt,
        Instant confirmedAt,
        Instant shippedAt,
        Instant deliveredAt,
        Instant inspectionEndsAt,
        Instant completedAt,
        Instant createdAt,
        Instant updatedAt) {

    public record Customer(Long id, String displayName, String email, String avatarUrl) {
    }

    public record Seller(Long id, String displayName, String avatarUrl) {
    }

    /** Gọi trong transaction: user và seller là quan hệ lazy. */
    public static OrderResponse from(Order o, boolean showCustomerEmail, Instant inspectionEndsAt) {
        var u = o.getUser();
        var s = o.getSeller();
        return new OrderResponse(o.getId(), o.getStatus(), o.isCare(),
                new Customer(u.getId(), u.getDisplayName(), showCustomerEmail ? u.getEmail() : null, u.getAvatarUrl()),
                s == null ? null : new Seller(s.getId(), s.getDisplayName(), s.getAvatarUrl()),
                o.getRecipientName(), o.getPhone(), o.getAddress(), o.getNote(), o.getTotalAmount(),
                o.getItems().stream().mapToInt(i -> i.getQuantity()).sum(),
                o.getItems().stream().map(OrderItemResponse::from).toList(),
                o.getTrackingCode(), o.getCancelReason(), o.getCancelledAt(), o.getPaymentDueAt(), o.getPaidAt(),
                o.getConfirmedAt(), o.getShippedAt(), o.getDeliveredAt(), inspectionEndsAt, o.getCompletedAt(),
                o.getCreatedAt(), o.getUpdatedAt());
    }
}
