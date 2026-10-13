package com.example.babything_api.core.security;

import java.time.Instant;

import com.example.babything_api.modules.users.entity.User;

/** Principal gắn vào SecurityContext sau khi access token hợp lệ. */
public record AuthPrincipal(User user, String jti, Instant accessExpiresAt) {
}
