package com.example.babything_api.modules.notifications.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.babything_api.modules.notifications.entity.NotificationPreference;

public interface NotificationPreferenceRepository
        extends JpaRepository<NotificationPreference, NotificationPreference.Key> {

    List<NotificationPreference> findByUserId(Long userId);
}
