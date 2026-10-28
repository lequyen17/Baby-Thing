package com.example.babything_api.modules.products.dto;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import com.example.babything_api.modules.products.entity.AgeRange;
import com.example.babything_api.modules.products.entity.ProductCondition;
import com.example.babything_api.modules.products.entity.ProductStatus;

/**
 * Dùng chung cho tạo mới và cập nhật (PUT thay toàn bộ). status: ACTIVE (hiển thị / gửi duyệt) hoặc INACTIVE (ẩn);
 * null = ACTIVE. Tin của thành viên luôn phải qua duyệt lại sau khi tạo / sửa, xem ProductService.
 * sku để trống: tạo mới thì server tự sinh, cập nhật thì giữ SKU cũ.
 * previousStock (chỉ khi cập nhật): tồn kho lúc mở form. Có giá trị thì server chỉ cộng phần chênh lệch
 * stock - previousStock vào kho hiện tại, để không xoá mất phần đã bị đơn hàng trừ trong lúc đang sửa.
 * imageUrls: ảnh thật theo thứ tự, ảnh đầu là ảnh bìa. Thành viên cần tối thiểu ProductService.MIN_IMAGES ảnh.
 */
public record ProductRequest(
        @Size(max = 64, message = "Mã SKU tối đa 64 ký tự")
        @Pattern(regexp = "^[A-Za-z0-9_-]*$", message = "Mã SKU chỉ gồm chữ cái không dấu, chữ số, - và _")
        String sku,
        @NotBlank(message = "Vui lòng nhập tên sản phẩm") @Size(max = 200, message = "Tên sản phẩm tối đa 200 ký tự")
        String name,
        @Size(max = 5000, message = "Mô tả tối đa 5000 ký tự") String description,
        @NotNull(message = "Vui lòng nhập giá") @DecimalMin(value = "0", message = "Giá không được âm")
        @DecimalMax(value = "9999999999.99", message = "Giá quá lớn")
        @Digits(integer = 10, fraction = 2, message = "Giá không hợp lệ") BigDecimal price,
        @NotNull(message = "Vui lòng nhập số lượng") @Min(value = 0, message = "Số lượng không được âm")
        @Max(value = 1_000_000_000, message = "Số lượng quá lớn") Integer stock,
        @Size(max = 100, message = "Danh mục tối đa 100 ký tự") String category,
        @Size(max = 10, message = "Tối đa 10 ảnh")
        List<@NotBlank(message = "Link ảnh không được trống") @Size(max = 500, message = "Link ảnh tối đa 500 ký tự")
                // Link ngoài, hoặc ảnh tải lên qua POST /api/products/images khi chưa cấu hình R2 (/api/uploads/...)
                @Pattern(regexp = "^(https?://\\S+|/api/uploads/(?!.*\\.\\.)[A-Za-z0-9/._-]+)$",
                        message = "Link ảnh phải bắt đầu bằng http:// hoặc https://") String> imageUrls,
        ProductCondition condition,
        @Size(max = 100, message = "Thương hiệu tối đa 100 ký tự") String brand,
        AgeRange ageRange,
        @Size(max = 30, message = "Kích cỡ tối đa 30 ký tự") String size,
        @Size(max = 1000, message = "Mô tả lỗi tối đa 1000 ký tự") String defects,
        @Size(max = 50, message = "Thời gian sử dụng tối đa 50 ký tự") String usageDuration,
        ProductStatus status,
        @Min(0) @Max(1_000_000_000) Integer previousStock) {
}
