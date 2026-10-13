package com.example.babything_api.modules.auth.dto;

/** Frontend lấy client id lúc chạy, không cần build lại UI khi đổi GOOGLE_CLIENT_ID. */
public record GoogleConfigResponse(boolean enabled, String clientId) {
}
