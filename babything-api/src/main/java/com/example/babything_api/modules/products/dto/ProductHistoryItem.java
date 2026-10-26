package com.example.babything_api.modules.products.dto;

import java.time.Instant;

import com.example.babything_api.modules.products.entity.ProductView;

/** Một dòng trong lịch sử xem của người dùng hiện tại. */
public record ProductHistoryItem(ProductResponse product, int viewCount, Instant firstViewedAt,
        Instant lastViewedAt) {

    public static ProductHistoryItem from(ProductView v) {
        return new ProductHistoryItem(ProductResponse.from(v.getProduct()), v.getViewCount(), v.getFirstViewedAt(),
                v.getLastViewedAt());
    }
}
