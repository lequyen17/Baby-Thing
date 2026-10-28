package com.example.babything_api.modules.orders.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.example.babything_api.modules.orders.entity.OrderStatus;

/** trackingCode: mã vận đơn, bắt buộc khi chuyển sang SHIPPING (kiểm tra trong service). */
public record OrderStatusRequest(
        @NotNull(message = "Vui lòng chọn trạng thái") OrderStatus status,
        @Size(max = 50, message = "Mã vận đơn tối đa 50 ký tự") String trackingCode) {
}
