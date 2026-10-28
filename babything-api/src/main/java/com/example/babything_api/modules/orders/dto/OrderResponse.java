package com.example.babything_api.modules.orders.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.example.babything_api.modules.orders.entity.Order;
import com.example.babything_api.modules.orders.entity.OrderStatus;

/** Dùng cho cả danh sách và chi tiết; danh sách cũng trả items để hiển thị tóm tắt. */
public record OrderResponse(
        Long id,
        OrderStatus status,
        Customer customer,
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

    public static OrderResponse from(Order o) {
        var u = o.getUser();
        return new OrderResponse(o.getId(), o.getStatus(),
                new Customer(u.getId(), u.getDisplayName(), u.getEmail(), u.getAvatarUrl()),
                o.getRecipientName(), o.getPhone(), o.getAddress(), o.getNote(), o.getTotalAmount(),
                o.getItems().stream().mapToInt(i -> i.getQuantity()).sum(),
                o.getItems().stream().map(OrderItemResponse::from).toList(),
                o.getCancelReason(), o.getCancelledAt(), o.getCreatedAt(), o.getUpdatedAt());
    }
}
