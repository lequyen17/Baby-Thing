package com.example.babything_api.modules.orders.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.example.babything_api.modules.payments.service.PaymentService;

/**
 * Việc định kỳ của luồng giao dịch. Mỗi đơn xử lý trong transaction riêng (gọi qua proxy của OrderService)
 * để một đơn lỗi không làm hỏng cả lượt.
 */
@Component
public class OrderJobs {

    private static final Logger log = LoggerFactory.getLogger(OrderJobs.class);

    private final OrderService orderService;
    private final PaymentService paymentService;

    public OrderJobs(OrderService orderService, PaymentService paymentService) {
        this.orderService = orderService;
        this.paymentService = paymentService;
    }

    @Scheduled(fixedDelayString = "PT1M", initialDelayString = "PT30S")
    void run() {
        int expiredPayments = paymentService.expireOverdue();
        int cancelled = 0;
        for (Long id : orderService.findOverdueUnpaid()) {
            try {
                if (orderService.expireUnpaid(id)) {
                    cancelled++;
                }
            } catch (RuntimeException e) {
                log.warn("Không huỷ được đơn quá hạn thanh toán #{}", id, e);
            }
        }
        int completed = 0;
        for (Long id : orderService.findInspectionEnded()) {
            try {
                if (orderService.autoComplete(id)) {
                    completed++;
                }
            } catch (RuntimeException e) {
                log.warn("Không tự hoàn tất được đơn #{}", id, e);
            }
        }
        if (expiredPayments + cancelled + completed > 0) {
            log.info("Job đơn hàng: {} giao dịch hết hạn, {} đơn quá hạn thanh toán bị huỷ, {} đơn tự hoàn tất",
                    expiredPayments, cancelled, completed);
        }
    }
}
