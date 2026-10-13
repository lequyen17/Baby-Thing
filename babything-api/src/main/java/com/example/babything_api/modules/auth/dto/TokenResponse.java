package com.example.babything_api.modules.auth.dto;

public record TokenResponse(String accessToken, String tokenType, long expiresIn) {
}
