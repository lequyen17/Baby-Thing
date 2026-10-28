package com.example.babything_api.modules.settlements.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.example.babything_api.modules.settlements.entity.Settlement;
import com.example.babything_api.modules.settlements.entity.SettlementStatus;

/**
 * Một khoản quyết toán. seller null khi tài khoản người bán đã bị xoá. payoutAccount chỉ trả cho admin
 * (để chuyển khoản), null khi người bán chưa khai báo.
 */
public record SettlementResponse(
        Long id,
        Long orderId,
        String firstItemName,
        String firstItemImageUrl,
        int itemCount,
        Seller seller,
        BigDecimal grossAmount,
        BigDecimal commissionRate,
        BigDecimal commissionAmount,
        BigDecimal netAmount,
        SettlementStatus status,
        String payoutReference,
        PayoutAccountDto payoutAccount,
        Instant paidAt,
        Instant createdAt) {

    public record Seller(Long id, String displayName, String email) {
    }

    /** Gọi trong transaction: order, items và seller là quan hệ lazy. */
    public static SettlementResponse from(Settlement s, PayoutAccountDto payoutAccount, boolean showEmail) {
        var o = s.getOrder();
        var first = o.getItems().isEmpty() ? null : o.getItems().get(0);
        var u = s.getSeller();
        return new SettlementResponse(s.getId(), o.getId(),
                first == null ? null : first.getProductName(),
                first == null ? null : first.getImageUrl(),
                o.getItems().size(),
                u == null ? null : new Seller(u.getId(), u.getDisplayName(), showEmail ? u.getEmail() : null),
                s.getGrossAmount(), s.getCommissionRate(), s.getCommissionAmount(), s.getNetAmount(), s.getStatus(),
                s.getPayoutReference(), payoutAccount, s.getPaidAt(), s.getCreatedAt());
    }
}
