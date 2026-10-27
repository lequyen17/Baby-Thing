package com.example.babything_api.modules.products.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.example.babything_api.modules.products.entity.Product;
import com.example.babything_api.modules.products.entity.ProductCondition;
import com.example.babything_api.modules.products.entity.ProductStatus;
import com.example.babything_api.modules.users.entity.User;

public record ProductResponse(
        Long id,
        String sku,
        String name,
        String description,
        BigDecimal price,
        int stock,
        String category,
        String imageUrl,
        ProductCondition condition,
        ProductStatus status,
        Long sellerId,
        String sellerName,
        Instant createdAt,
        Instant updatedAt) {

    /** Gọi trong transaction: seller là quan hệ lazy. */
    public static ProductResponse from(Product p) {
        User seller = p.getSeller();
        return new ProductResponse(p.getId(), p.getSku(), p.getName(), p.getDescription(), p.getPrice(),
                p.getStock(), p.getCategory(), p.getImageUrl(), p.getCondition(), p.getStatus(), p.getCreatedBy(),
                seller == null ? null : seller.getDisplayName(), p.getCreatedAt(), p.getUpdatedAt());
    }
}
