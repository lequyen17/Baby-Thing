package com.example.babything_api.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "Link đặt lại mật khẩu không hợp lệ") String token,
        @NotBlank(message = "Vui lòng nhập mật khẩu mới") @Size(min = 8, max = 72, message = "Mật khẩu từ 8 đến 72 ký tự") String newPassword) {
}
