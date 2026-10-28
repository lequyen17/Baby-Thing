package com.example.babything_api.modules.products.dto;

import jakarta.validation.constraints.NotNull;

/** Người bán ẩn / hiện lại tin đã duyệt mà không phải gửi duyệt lại. */
public record VisibilityRequest(@NotNull(message = "Thiếu trạng thái hiển thị") Boolean visible) {
}
