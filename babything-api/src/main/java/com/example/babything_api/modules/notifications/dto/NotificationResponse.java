package com.example.babything_api.modules.notifications.dto;

import java.time.Instant;

import com.example.babything_api.modules.notifications.entity.Notification;

public record NotificationResponse(Long id, String group, String title, String body, String link, boolean read,
        Instant at) {

    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(n.getId(), n.getGroup(), n.getTitle(), n.getBody(), n.getLink(),
                n.getReadAt() != null, n.getCreatedAt());
    }
}
