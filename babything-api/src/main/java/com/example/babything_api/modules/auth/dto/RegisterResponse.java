package com.example.babything_api.modules.auth.dto;

/** verificationRequired = false: tài khoản đã được tạo, frontend chuyển thẳng sang đăng nhập. */
public record RegisterResponse(String message, boolean verificationRequired) {
}
