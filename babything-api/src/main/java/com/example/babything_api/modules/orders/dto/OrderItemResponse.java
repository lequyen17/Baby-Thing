package com.example.babything_api.modules.orders.dto;

import java.math.BigDecimal;
import java.util.List;

import com.example.babything_api.modules.orders.entity.OrderItem;
import com.example.babything_api.modules.products.entity.AgeRange;
import com.example.babything_api.modules.products.entity.ProductCondition;

/** Kèm bản chụp tin đăng lúc mua (snapshot), không đổi khi người bán sửa tin sau đó. */
public record OrderItemResponse(
        Long id,
        Long productId,
        String productName,
        String productSku,
        String imageUrl,
        BigDecimal unitPrice,
        int quantity,
        BigDecimal lineTotal,
        Snapshot snapshot) {

    public record Snapshot(String description, ProductCondition condition, String brand, AgeRange ageRange,
            String size, String defects, String usageDuration, List<String> imageUrls) {
    }

    public static OrderItemResponse from(OrderItem i) {
        return new OrderItemResponse(i.getId(), i.getProductId(), i.getProductName(), i.getProductSku(),
                i.getImageUrl(), i.getUnitPrice(), i.getQuantity(), i.getLineTotal(),
                new Snapshot(i.getDescription(), i.getCondition(), i.getBrand(), i.getAgeRange(), i.getSize(),
                        i.getDefects(), i.getUsageDuration(), i.getImageUrls()));
    }
}
