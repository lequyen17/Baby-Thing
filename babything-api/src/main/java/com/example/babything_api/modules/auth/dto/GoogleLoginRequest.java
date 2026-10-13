package com.example.babything_api.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** credential = ID token mà Google Identity Services trả về cho frontend. */
public record GoogleLoginRequest(@NotBlank String credential) {
}
