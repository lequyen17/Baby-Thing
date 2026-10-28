package com.example.babything_api.modules.orders.dto;

import jakarta.validation.constraints.NotNull;

import com.example.babything_api.modules.orders.entity.OrderStatus;

public record OrderStatusRequest(@NotNull(message = "Vui lòng chọn trạng thái") OrderStatus status) {
}
