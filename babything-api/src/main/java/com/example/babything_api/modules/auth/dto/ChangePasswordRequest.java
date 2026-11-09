package com.example.babything_api.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại") String currentPassword,
        @NotBlank(message = "Vui lòng nhập mật khẩu mới") @Size(min = 8, max = 72, message = "Mật khẩu từ 8 đến 72 ký tự") String newPassword) {
}
