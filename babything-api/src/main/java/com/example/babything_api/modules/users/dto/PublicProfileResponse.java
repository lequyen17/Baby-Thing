package com.example.babything_api.modules.users.dto;

import java.time.Instant;

import com.example.babything_api.modules.users.entity.User;

/** Chỉ các trường được phép công khai: không có email, role hay lần đăng nhập. */
public record PublicProfileResponse(Long id, String displayName, String avatarUrl, boolean verified,
        Instant joinedAt) {

    public static PublicProfileResponse from(User user) {
        return new PublicProfileResponse(user.getId(), user.getDisplayName(), user.getAvatarUrl(),
                user.getEmailVerifiedAt() != null, user.getCreatedAt());
    }
}
