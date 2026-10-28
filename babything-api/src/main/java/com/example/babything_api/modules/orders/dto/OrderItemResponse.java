package com.example.babything_api.modules.orders.dto;

import java.math.BigDecimal;

import com.example.babything_api.modules.orders.entity.OrderItem;

public record OrderItemResponse(
        Long id,
        Long productId,
        String productName,
        String productSku,
        String imageUrl,
        BigDecimal unitPrice,
        int quantity,
        BigDecimal lineTotal) {

    public static OrderItemResponse from(OrderItem i) {
        return new OrderItemResponse(i.getId(), i.getProductId(), i.getProductName(), i.getProductSku(),
                i.getImageUrl(), i.getUnitPrice(), i.getQuantity(), i.getLineTotal());
    }
}
