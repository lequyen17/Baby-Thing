package com.example.babything_api.modules.settlements.entity;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import com.example.babything_api.modules.orders.entity.Order;
import com.example.babything_api.modules.users.entity.User;

/** Khoản phải trả người bán cho một đơn hoàn tất: netAmount = grossAmount − commissionAmount. */
@Entity
@Table(name = "settlements")
public class Settlement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false, updatable = false)
    private Order order;

    /** null khi tài khoản người bán đã bị xoá. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", updatable = false)
    private User seller;

    @Column(name = "gross_amount", nullable = false, precision = 14, scale = 2, updatable = false)
    private BigDecimal grossAmount;

    @Column(name = "commission_rate", nullable = false, precision = 5, scale = 4, updatable = false)
    private BigDecimal commissionRate;

    @Column(name = "commission_amount", nullable = false, precision = 14, scale = 2, updatable = false)
    private BigDecimal commissionAmount;

    @Column(name = "net_amount", nullable = false, precision = 14, scale = 2, updatable = false)
    private BigDecimal netAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SettlementStatus status = SettlementStatus.PENDING;

    /** Mã giao dịch chuyển khoản / ghi chú admin nhập khi chi trả. */
    @Column(name = "payout_reference", length = 100)
    private String payoutReference;

    @Column(name = "paid_by")
    private Long paidBy;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public static Settlement of(Order order, BigDecimal commissionRate, BigDecimal commissionAmount) {
        Settlement s = new Settlement();
        s.order = order;
        s.seller = order.getSeller();
        s.grossAmount = order.getTotalAmount();
        s.commissionRate = commissionRate;
        s.commissionAmount = commissionAmount;
        s.netAmount = order.getTotalAmount().subtract(commissionAmount);
        return s;
    }

    public void markPaid(Long admin, String reference) {
        status = SettlementStatus.PAID;
        paidBy = admin;
        paidAt = Instant.now();
        payoutReference = reference;
    }

    public Long getId() {
        return id;
    }

    public Order getOrder() {
        return order;
    }

    public User getSeller() {
        return seller;
    }

    public BigDecimal getGrossAmount() {
        return grossAmount;
    }

    public BigDecimal getCommissionRate() {
        return commissionRate;
    }

    public BigDecimal getCommissionAmount() {
        return commissionAmount;
    }

    public BigDecimal getNetAmount() {
        return netAmount;
    }

    public SettlementStatus getStatus() {
        return status;
    }

    public String getPayoutReference() {
        return payoutReference;
    }

    public Instant getPaidAt() {
        return paidAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
