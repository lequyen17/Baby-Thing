package com.example.babything_api.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Vui lòng nhập email") @Email(message = "Email không hợp lệ") @Size(max = 255, message = "Email tối đa 255 ký tự") String email,
        @NotBlank(message = "Vui lòng nhập mật khẩu") @Size(min = 8, max = 72, message = "Mật khẩu từ 8 đến 72 ký tự") String password,
        @NotBlank(message = "Vui lòng nhập tên hiển thị") @Size(max = 50, message = "Tên hiển thị tối đa 50 ký tự") String displayName) {
}
