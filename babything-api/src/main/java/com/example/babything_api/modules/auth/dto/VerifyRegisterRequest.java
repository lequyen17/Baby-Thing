package com.example.babything_api.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyRegisterRequest(
        @NotBlank(message = "Vui lòng nhập email") @Email(message = "Email không hợp lệ") String email,
        @NotBlank(message = "Vui lòng nhập mã xác minh") @Pattern(regexp = "\\d{6}", message = "Mã xác minh gồm 6 chữ số") String otp) {
}
