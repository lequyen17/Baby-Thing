package com.example.babything_api.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyLoginRequest(
        @NotBlank(message = "Thiếu mã phiên xác minh") String challengeId,
        @NotBlank(message = "Vui lòng nhập mã xác minh") @Pattern(regexp = "\\d{6}", message = "Mã xác minh gồm 6 chữ số") String otp) {
}
