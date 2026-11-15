package com.example.babything_api.core.security;

import java.util.Optional;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import com.example.babything_api.config.AppProperties;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class RefreshTokenCookieService {

    public static final String COOKIE_NAME = "refresh_token";
    public static final String HEADER_NAME = "X-Refresh-Token";

    private final AppProperties props;

    public RefreshTokenCookieService(AppProperties props) {
        this.props = props;
    }

    /** Ưu tiên cookie; không có thì lấy header {@value #HEADER_NAME} (frontend khác domain lưu token trong localStorage). */
    public Optional<String> read(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return fromHeader(request);
        }
        for (Cookie cookie : cookies) {
            if (COOKIE_NAME.equals(cookie.getName())) {
                String value = cookie.getValue();
                if (value != null && !value.isBlank()) {
                    return Optional.of(value);
                }
            }
        }
        return fromHeader(request);
    }

    private static Optional<String> fromHeader(HttpServletRequest request) {
        String value = request.getHeader(HEADER_NAME);
        return value != null && !value.isBlank() ? Optional.of(value) : Optional.empty();
    }

    public void write(HttpServletResponse response, String plainRefreshToken) {
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie(plainRefreshToken, props.jwt().refreshTtl().toSeconds())
                .toString());
    }

    public void clear(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie("", 0).toString());
    }

    private ResponseCookie buildCookie(String value, long maxAgeSeconds) {
        return ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true)
                .secure(props.cookieSecure())
                .sameSite("Lax")
                .path("/api/auth")
                .maxAge(maxAgeSeconds)
                .build();
    }
}
