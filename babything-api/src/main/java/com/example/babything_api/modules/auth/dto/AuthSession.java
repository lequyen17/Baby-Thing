package com.example.babything_api.modules.auth.dto;

/** Cặp token trả về từ service; refresh plain chỉ ghi vào HttpOnly cookie ở controller. */
public record AuthSession(TokenResponse tokens, String refreshTokenPlain) {
}
