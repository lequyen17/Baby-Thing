package com.example.babything_api.modules.notifications.entity;

import java.io.Serializable;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

@Entity
@Table(name = "notification_preferences")
@IdClass(NotificationPreference.Key.class)
public class NotificationPreference {

    public record Key(Long userId, String group) implements Serializable {
    }

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Id
    @Column(name = "group_key", length = 30)
    private String group;

    @Column(nullable = false)
    private boolean enabled;

    protected NotificationPreference() {
    }

    public NotificationPreference(Long userId, String group, boolean enabled) {
        this.userId = userId;
        this.group = group;
        this.enabled = enabled;
    }

    public Long getUserId() {
        return userId;
    }

    public String getGroup() {
        return group;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }
}
