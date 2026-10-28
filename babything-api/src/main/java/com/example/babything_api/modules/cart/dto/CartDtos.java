package com.example.babything_api.modules.cart.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import com.example.babything_api.modules.products.entity.ProductCondition;

public final class CartDtos {

    private CartDtos() {
    }

    public record AddRequest(
            @NotNull(message = "Vui lòng chọn sản phẩm") Long productId,
            @Min(value = 1, message = "Số lượng tối thiểu là 1") @Max(value = 999, message = "Số lượng tối đa là 999")
            Integer quantity) {
    }

    public record QuantityRequest(
            @NotNull(message = "Vui lòng nhập số lượng") @Min(value = 1, message = "Số lượng tối thiểu là 1")
            @Max(value = 999, message = "Số lượng tối đa là 999") Integer quantity) {
    }

    /**
     * unavailableReason: null = đặt được; ngược lại là lý do (tin đã xoá / ngừng bán / hết hàng / không đủ hàng)
     * để giao diện làm mờ dòng đó và không cho chọn đặt.
     */
    public record Item(Long productId, String name, String sku, String imageUrl, String category,
            ProductCondition condition, BigDecimal price, BigDecimal priceAtAdd, int stock, int quantity,
            Long sellerId, String sellerName, boolean available, String unavailableReason, Instant addedAt) {
    }

    /** availableTotal: tổng tiền các dòng đặt được, theo giá hiện tại. */
    public record CartResponse(List<Item> items, int availableCount, BigDecimal availableTotal) {
    }

    public record CountResponse(long count) {
    }
}
