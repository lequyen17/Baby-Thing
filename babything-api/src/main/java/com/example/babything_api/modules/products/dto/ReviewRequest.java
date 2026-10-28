package com.example.babything_api.modules.products.dto;

import jakarta.validation.constraints.Size;

/** Admin từ chối tin: reason bắt buộc (kiểm tra trong service), người bán thấy để sửa lại. */
public record ReviewRequest(@Size(max = 500, message = "Lý do tối đa 500 ký tự") String reason) {
}
