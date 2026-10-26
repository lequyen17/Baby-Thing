package com.example.babything_api.modules.products.dto;

import java.time.Instant;

import com.example.babything_api.modules.products.entity.ProductView;

/** Một người đã xem sản phẩm (admin xem). */
public record ProductViewerItem(Long userId, String displayName, String email, String avatarUrl, int viewCount,
        Instant firstViewedAt, Instant lastViewedAt) {

    public static ProductViewerItem from(ProductView v) {
        var u = v.getUser();
        return new ProductViewerItem(u.getId(), u.getDisplayName(), u.getEmail(), u.getAvatarUrl(), v.getViewCount(),
                v.getFirstViewedAt(), v.getLastViewedAt());
    }
}
