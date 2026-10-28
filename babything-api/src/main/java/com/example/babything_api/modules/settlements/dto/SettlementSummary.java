package com.example.babything_api.modules.settlements.dto;

import java.math.BigDecimal;

/** Người bán: tiền chờ chi trả / đã nhận và hoa hồng đã trừ. Admin: tổng toàn sàn (commissionTotal = doanh thu). */
public record SettlementSummary(
        BigDecimal pendingAmount,
        long pendingCount,
        BigDecimal paidAmount,
        long paidCount,
        BigDecimal commissionTotal,
        BigDecimal commissionRate) {
}
