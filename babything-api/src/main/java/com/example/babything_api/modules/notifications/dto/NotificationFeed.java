package com.example.babything_api.modules.notifications.dto;

import java.util.List;

/** Một trang thông báo kèm tổng số chưa đọc của cả tài khoản (cho chuông trên header). */
public record NotificationFeed(List<NotificationResponse> items, long unread, int page, int totalPages,
        long totalItems) {
}
