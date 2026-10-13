package com.example.babything_api.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyLoginRequest(
        @NotBlank String challengeId,
        @NotBlank @Pattern(regexp = "\\d{6}", message = "Verification code must be 6 digits") String otp) {
}
