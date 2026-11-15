package com.example.babything_api.modules.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/** refreshToken chỉ có khi app.refresh-token-in-body = true (frontend khác domain với API, không dùng được cookie). */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record TokenResponse(String accessToken, String tokenType, long expiresIn, String refreshToken) {

    public TokenResponse(String accessToken, String tokenType, long expiresIn) {
        this(accessToken, tokenType, expiresIn, null);
    }

    public TokenResponse withRefreshToken(String refreshToken) {
        return new TokenResponse(accessToken, tokenType, expiresIn, refreshToken);
    }
}
