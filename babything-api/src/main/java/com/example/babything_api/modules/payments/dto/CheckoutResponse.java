package com.example.babything_api.modules.payments.dto;

/** checkoutUrl: chuyển người mua sang đây để thanh toán (đường dẫn tương đối = trang của frontend). */
public record CheckoutResponse(PaymentResponse payment, String checkoutUrl) {
}
