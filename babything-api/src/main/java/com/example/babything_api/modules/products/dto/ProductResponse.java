package com.example.babything_api.modules.products.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.example.babything_api.modules.products.entity.Product;
import com.example.babything_api.modules.products.entity.ProductStatus;

public record ProductResponse(
        Long id,
        String sku,
        String name,
        String description,
        BigDecimal price,
        int stock,
        String category,
        String imageUrl,
        ProductStatus status,
        Instant createdAt,
        Instant updatedAt) {

    public static ProductResponse from(Product p) {
        return new ProductResponse(p.getId(), p.getSku(), p.getName(), p.getDescription(), p.getPrice(),
                p.getStock(), p.getCategory(), p.getImageUrl(), p.getStatus(), p.getCreatedAt(), p.getUpdatedAt());
    }
}
