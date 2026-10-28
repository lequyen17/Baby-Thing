package com.example.babything_api.modules.products.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import com.example.babything_api.modules.products.entity.ProductCondition;
import com.example.babything_api.modules.products.entity.ProductStatus;

/**
 * Dùng chung cho tạo mới và cập nhật (PUT thay toàn bộ). status null = ACTIVE.
 * sku để trống: tạo mới thì server tự sinh, cập nhật thì giữ SKU cũ.
 */
public record ProductRequest(
        @Size(max = 64)
        @Pattern(regexp = "^[A-Za-z0-9_-]*$", message = "SKU may only contain letters, digits, - and _")
        String sku,
        @NotBlank(message = "Name is required") @Size(max = 200) String name,
        @Size(max = 5000) String description,
        @NotNull(message = "Price is required") @DecimalMin(value = "0", message = "Price must not be negative")
        @DecimalMax(value = "9999999999.99") @Digits(integer = 10, fraction = 2) BigDecimal price,
        @NotNull(message = "Stock is required") @Min(value = 0, message = "Stock must not be negative") @Max(1_000_000_000) Integer stock,
        @Size(max = 100) String category,
        @Size(max = 500) @Pattern(regexp = "^(https?://\\S+)?$", message = "Image URL must start with http:// or https://")
        String imageUrl,
        ProductCondition condition,
        ProductStatus status) {
}
