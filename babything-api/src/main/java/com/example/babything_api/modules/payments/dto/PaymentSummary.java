package com.example.babything_api.modules.payments.dto;

import java.math.BigDecimal;

/** Thống kê đầu trang "Thanh toán của tôi". */
public record PaymentSummary(
        BigDecimal totalPaid,
        long paidCount,
        long pendingCount,
        BigDecimal totalRefunded,
        long refundedCount) {
}
