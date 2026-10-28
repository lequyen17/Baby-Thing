package com.example.babything_api.modules.orders.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record OrderItemRequest(
        @NotNull(message = "Vui lòng chọn sản phẩm") Long productId,
        @NotNull(message = "Vui lòng nhập số lượng") @Min(value = 1, message = "Số lượng tối thiểu là 1")
        @Max(value = 999, message = "Số lượng tối đa là 999") Integer quantity) {
}
