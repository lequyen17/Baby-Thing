package com.example.babything_api.modules.payments.gateway;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.example.babything_api.modules.payments.entity.Payment;

/**
 * Cổng giả lập cho môi trường dev / demo: trang /pay/{ref} của frontend đóng vai cổng, người mua bấm
 * "thanh toán thành công / thất bại" và kết quả đi qua cùng đường xử lý với callback của cổng thật.
 * Thay bằng bean VNPAY / MoMo khi có hợp đồng đối tác.
 */
@Component
public class MockPaymentGateway implements PaymentGateway {

    public static final String NAME = "MOCK";

    private static final Logger log = LoggerFactory.getLogger(MockPaymentGateway.class);

    @Override
    public String name() {
        return NAME;
    }

    @Override
    public String checkoutUrl(Payment payment) {
        return "/pay/" + payment.getTransactionRef();
    }

    @Override
    public void refund(Payment payment) {
        log.info("[MOCK] Hoàn {} cho giao dịch {}", payment.getAmount(), payment.getTransactionRef());
    }
}
