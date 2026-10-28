package com.example.babything_api.modules.orders.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.example.babything_api.modules.orders.entity.Order;
import com.example.babything_api.modules.orders.entity.OrderStatus;

/**
 * Dùng cho cả danh sách và chi tiết; danh sách cũng trả items để hiển thị tóm tắt.
 * seller null khi tin đăng không còn người bán. customer.email chỉ có khi người xem là chính người mua hoặc admin.
 */
public record OrderResponse(
        Long id,
        OrderStatus status,
        Customer customer,
        Seller seller,
        String recipientName,
        String phone,
        String address,
        String note,
        BigDecimal totalAmount,
        int totalQuantity,
        List<OrderItemResponse> items,
        String cancelReason,
        Instant cancelledAt,
        Instant createdAt,
        Instant updatedAt) {

    public record Customer(Long id, String displayName, String email, String avatarUrl) {
    }

    public record Seller(Long id, String displayName, String avatarUrl) {
    }

    /** Gọi trong transaction: user và seller là quan hệ lazy. */
    public static OrderResponse from(Order o, boolean showCustomerEmail) {
        var u = o.getUser();
        var s = o.getSeller();
        return new OrderResponse(o.getId(), o.getStatus(),
                new Customer(u.getId(), u.getDisplayName(), showCustomerEmail ? u.getEmail() : null, u.getAvatarUrl()),
                s == null ? null : new Seller(s.getId(), s.getDisplayName(), s.getAvatarUrl()),
                o.getRecipientName(), o.getPhone(), o.getAddress(), o.getNote(), o.getTotalAmount(),
                o.getItems().stream().mapToInt(i -> i.getQuantity()).sum(),
                o.getItems().stream().map(OrderItemResponse::from).toList(),
                o.getCancelReason(), o.getCancelledAt(), o.getCreatedAt(), o.getUpdatedAt());
    }
}
