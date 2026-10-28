package com.example.babything_api.modules.products.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.example.babything_api.modules.care.entity.CareGrade;
import com.example.babything_api.modules.care.entity.CareItem;
import com.example.babything_api.modules.products.entity.AgeRange;
import com.example.babything_api.modules.products.entity.Product;
import com.example.babything_api.modules.products.entity.ProductCondition;
import com.example.babything_api.modules.products.entity.ProductStatus;
import com.example.babything_api.modules.users.entity.User;

/**
 * approved = nội dung hiện tại đã được duyệt, nên người bán ẩn / hiện lại tin mà không cần duyệt lại.
 * care != null = hàng BabyThings Renewed: Baby Things đã kiểm tra, làm sạch và đang bán hộ.
 */
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
        Care care,
        Instant reviewedAt,
        Instant createdAt,
        Instant updatedAt) {

    /** Hồ sơ xử lý Care hiển thị cho người mua. */
    public record Care(String batchCode, CareGrade grade, String gradeLabel, Instant receivedAt, Instant cleanedAt) {

        static Care from(CareItem item) {
            if (item == null) {
                return null;
            }
            var batch = item.getBatch();
            return new Care(batch.getCode(), item.getGrade(), item.getGrade() == null ? null : item.getGrade().label(),
                    batch.getReceivedAt(), batch.getCleanedAt());
        }
    }

    /** Gọi trong transaction: seller, imageUrls và careItem là quan hệ lazy. */
    public static ProductResponse from(Product p) {
        User seller = p.getSeller();
        return new ProductResponse(p.getId(), p.getSku(), p.getName(), p.getDescription(), p.getPrice(),
                p.getStock(), p.getCategory(), p.getImageUrl(), List.copyOf(p.getImageUrls()), p.getCondition(),
                p.getBrand(), p.getAgeRange(), p.getSize(), p.getDefects(), p.getUsageDuration(), p.getStatus(),
                p.getReviewedAt() != null, p.getRejectReason(), p.getCreatedBy(),
                seller == null ? null : seller.getDisplayName(), Care.from(p.getCareItem()), p.getReviewedAt(),
                p.getCreatedAt(), p.getUpdatedAt());
    }
}
