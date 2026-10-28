package com.example.babything_api.modules.products.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.example.babything_api.modules.products.entity.AgeRange;
import com.example.babything_api.modules.products.entity.Product;
import com.example.babything_api.modules.products.entity.ProductCondition;
import com.example.babything_api.modules.products.entity.ProductStatus;
import com.example.babything_api.modules.users.entity.User;

/** approved = nội dung hiện tại đã được duyệt, nên người bán ẩn / hiện lại tin mà không cần duyệt lại. */
public record ProductResponse(
        Long id,
        String sku,
        String name,
        String description,
        BigDecimal price,
        int stock,
        String category,
        String imageUrl,
        List<String> imageUrls,
        ProductCondition condition,
        String brand,
        AgeRange ageRange,
        String size,
        String defects,
        String usageDuration,
        ProductStatus status,
        boolean approved,
        String rejectReason,
        Long sellerId,
        String sellerName,
        Instant reviewedAt,
        Instant createdAt,
        Instant updatedAt) {

    /** Gọi trong transaction: seller và imageUrls là quan hệ lazy. */
    public static ProductResponse from(Product p) {
        User seller = p.getSeller();
        return new ProductResponse(p.getId(), p.getSku(), p.getName(), p.getDescription(), p.getPrice(),
                p.getStock(), p.getCategory(), p.getImageUrl(), List.copyOf(p.getImageUrls()), p.getCondition(),
                p.getBrand(), p.getAgeRange(), p.getSize(), p.getDefects(), p.getUsageDuration(), p.getStatus(),
                p.getReviewedAt() != null, p.getRejectReason(), p.getCreatedBy(),
                seller == null ? null : seller.getDisplayName(), p.getReviewedAt(), p.getCreatedAt(),
                p.getUpdatedAt());
    }
}
