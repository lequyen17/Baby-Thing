package com.example.babything_api.modules.users.dto;

import java.time.Instant;

import com.example.babything_api.modules.users.entity.Role;
import com.example.babything_api.modules.users.entity.User;

public record UserProfileResponse(
        Long id,
        String email,
        String displayName,
        String avatarUrl,
        Role role,
        boolean hasPassword,
        Instant emailVerifiedAt,
        Instant lastLoginAt,
        Instant createdAt,
        boolean avatarUploadEnabled) {

    public static UserProfileResponse from(User user, boolean avatarUploadEnabled) {
        return new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getAvatarUrl(),
                user.getRole(),
                user.getPassword() != null,
                user.getEmailVerifiedAt(),
                user.getLastLoginAt(),
                user.getCreatedAt(),
                avatarUploadEnabled);
    }
}
