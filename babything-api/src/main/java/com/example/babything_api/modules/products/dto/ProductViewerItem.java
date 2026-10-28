package com.example.babything_api.modules.products.dto;

import java.time.Instant;

import com.example.babything_api.modules.products.entity.ProductView;

/** Một người đã xem sản phẩm (người bán hoặc admin xem). email chỉ có khi người xem danh sách là admin. */
public record ProductViewerItem(Long userId, String displayName, String email, String avatarUrl, int viewCount,
        Instant firstViewedAt, Instant lastViewedAt) {

    public static ProductViewerItem from(ProductView v, boolean includeEmail) {
        var u = v.getUser();
        return new ProductViewerItem(u.getId(), u.getDisplayName(), includeEmail ? u.getEmail() : null,
                u.getAvatarUrl(), v.getViewCount(), v.getFirstViewedAt(), v.getLastViewedAt());
    }
}
