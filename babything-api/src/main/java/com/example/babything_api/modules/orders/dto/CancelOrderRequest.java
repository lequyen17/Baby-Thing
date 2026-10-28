package com.example.babything_api.modules.orders.dto;

import jakarta.validation.constraints.Size;

/** Body tuỳ chọn của POST /api/orders/{id}/cancel. */
public record CancelOrderRequest(@Size(max = 500, message = "Lý do huỷ tối đa 500 ký tự") String reason) {
}
