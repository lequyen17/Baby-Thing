package com.example.babything_api.modules.payments.dto;

import jakarta.validation.constraints.NotNull;

import com.example.babything_api.modules.payments.entity.PaymentMethod;

public record CheckoutRequest(
        @NotNull(message = "Thiếu mã đơn hàng") Long orderId,
        @NotNull(message = "Vui lòng chọn hình thức thanh toán") PaymentMethod method) {
}
