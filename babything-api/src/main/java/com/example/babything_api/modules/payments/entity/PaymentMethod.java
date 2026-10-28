package com.example.babything_api.modules.payments.entity;

/** Các hình thức qua cổng thanh toán; chưa hỗ trợ thanh toán khi nhận hàng (xem FAQ). */
public enum PaymentMethod {
    QR("Quét mã QR"),
    ATM_CARD("Thẻ ATM nội địa"),
    E_WALLET("Ví điện tử");

    private final String label;

    PaymentMethod(String label) {
        this.label = label;
    }

    /** Tên hiển thị, khớp PAYMENT_METHODS phía UI. */
    public String label() {
        return label;
    }
}
