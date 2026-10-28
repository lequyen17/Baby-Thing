package com.example.babything_api.modules.payments.dto;

import jakarta.validation.constraints.NotNull;

/** Kết quả người mua chọn trên trang cổng giả lập. */
public record MockResultRequest(@NotNull(message = "Thiếu kết quả thanh toán") Boolean success) {
}
