package com.example.babything_api.modules.payments.entity;

/** PENDING → PAID → REFUNDED; PENDING hết 15 phút giữ chỗ thì EXPIRED, cổng báo lỗi thì FAILED. */
public enum PaymentStatus {
    PENDING("Chờ thanh toán"),
    PAID("Đã thanh toán"),
    FAILED("Thất bại"),
    EXPIRED("Hết hạn"),
    REFUNDED("Đã hoàn tiền");

    private final String label;

    PaymentStatus(String label) {
        this.label = label;
    }

    /** Tên hiển thị, khớp PAYMENT_STATUSES phía UI. */
    public String label() {
        return label;
    }
}
