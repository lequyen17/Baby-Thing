package com.example.babything_api.core.utils;

import jakarta.servlet.http.HttpServletRequest;

public final class ClientIp {

    private ClientIp() {
    }

    /**
     * Sau nginx (Docker) tin header X-Real-IP do nginx đặt. Trên Render không có nginx, proxy của Render
     * đặt IP thật ở đầu X-Forwarded-For; không đọc thì mọi người dùng chung IP của proxy và chung giới hạn đăng nhập.
     */
    public static String of(HttpServletRequest request) {
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
