package com.example.babything_api.core.utils;

import jakarta.servlet.http.HttpServletRequest;

public final class ClientIp {

    private ClientIp() {
    }

    /** API chỉ nhận request đi qua nginx, nên tin header X-Real-IP do nginx đặt. */
    public static String of(HttpServletRequest request) {
        String realIp = request.getHeader("X-Real-IP");
        return realIp != null && !realIp.isBlank() ? realIp : request.getRemoteAddr();
    }
}
