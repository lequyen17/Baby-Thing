package com.example.babything_api.modules.products.entity;

/**
 * Khách chỉ thấy ACTIVE. Tin người bán tạo / sửa vào PENDING_REVIEW, admin duyệt thành ACTIVE hoặc từ chối
 * thành REJECTED. INACTIVE = người bán tự ẩn tin.
 */
public enum ProductStatus {
    PENDING_REVIEW, ACTIVE, INACTIVE, REJECTED
}
