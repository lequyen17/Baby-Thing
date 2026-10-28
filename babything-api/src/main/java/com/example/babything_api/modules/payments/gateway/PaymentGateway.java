package com.example.babything_api.modules.payments.gateway;

import com.example.babything_api.modules.payments.entity.Payment;

/**
 * Cổng thanh toán của đối tác (VNPAY, MoMo...). Baby Things không giữ tiền trong ví nội bộ: người mua trả qua cổng,
 * cổng báo kết quả về PaymentService.handleResult (IPN / callback).
 */
public interface PaymentGateway {

    /** Lưu vào payments.provider. */
    String name();

    /** URL chuyển người mua sang trang thanh toán; đường dẫn tương đối là trang của frontend. */
    String checkoutUrl(Payment payment);

    /** Yêu cầu cổng hoàn tiền cho giao dịch đã PAID. Lỗi thì ném exception để transaction rollback. */
    void refund(Payment payment);
}
