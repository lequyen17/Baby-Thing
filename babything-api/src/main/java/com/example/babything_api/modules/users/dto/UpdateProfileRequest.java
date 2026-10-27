package com.example.babything_api.modules.users.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank @Size(min = 2, max = 50, message = "Tên hiển thị từ 2 đến 50 ký tự") String displayName) {
}
