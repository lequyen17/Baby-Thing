package com.example.babything_api.modules.care.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.BatchSize;

import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import com.example.babything_api.modules.users.entity.User;

/** Một lô ký gửi Care của người bán, 1–5 món. Các mốc thời gian ghi lại từng bước của quy trình. */
@Entity
@Table(name = "care_batches")
@BatchSize(size = 50)
public class CareBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20, updatable = false)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seller_id", nullable = false, updatable = false)
    private User seller;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CareBatchStatus status = CareBatchStatus.SUBMITTED;

    @Enumerated(EnumType.STRING)
    @Column(name = "dropoff_method", nullable = false, length = 20)
    private DropoffMethod dropoffMethod;

    @Column(name = "seller_note", length = 1000)
    private String sellerNote;

    @Column(name = "decline_reason", length = 500)
    private String declineReason;

    @Column(name = "expected_min", precision = 12, scale = 2)
    private BigDecimal expectedMin;

    @Column(name = "expected_max", precision = 12, scale = 2)
    private BigDecimal expectedMax;

    @Column(name = "estimated_fee", precision = 12, scale = 2)
    private BigDecimal estimatedFee;

    @Column(name = "pre_quoted_at")
    private Instant preQuotedAt;

    @Column(name = "agreed_at")
    private Instant agreedAt;

    @Column(name = "received_at")
    private Instant receivedAt;

    @Column(name = "intake_note", length = 1000)
    private String intakeNote;

    @Column(name = "cleaning_fee", precision = 12, scale = 2)
    private BigDecimal cleaningFee;

    @Column(name = "quoted_at")
    private Instant quotedAt;

    @Column(name = "fee_payment_ref", length = 40)
    private String feePaymentRef;

    @Column(name = "fee_paid_at")
    private Instant feePaidAt;

    @Column(name = "cleaned_at")
    private Instant cleanedAt;

    @Column(name = "listed_at")
    private Instant listedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "extended_at")
    private Instant extendedAt;

    @Column(name = "price_dropped_at")
    private Instant priceDroppedAt;

    @Column(name = "expiry_reminded_at")
    private Instant expiryRemindedAt;

    @Column(name = "return_reason", length = 500)
    private String returnReason;

    @Column(name = "returned_at")
    private Instant returnedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "batch", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    @BatchSize(size = 50)
    private List<CareItem> items = new ArrayList<>();

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public void addItem(CareItem item) {
        item.setBatch(this);
        item.setPosition(items.size() + 1);
        items.add(item);
    }

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public User getSeller() {
        return seller;
    }

    public void setSeller(User seller) {
        this.seller = seller;
    }

    public CareBatchStatus getStatus() {
        return status;
    }

    public void setStatus(CareBatchStatus status) {
        this.status = status;
    }

    public DropoffMethod getDropoffMethod() {
        return dropoffMethod;
    }

    public void setDropoffMethod(DropoffMethod dropoffMethod) {
        this.dropoffMethod = dropoffMethod;
    }

    public String getSellerNote() {
        return sellerNote;
    }

    public void setSellerNote(String sellerNote) {
        this.sellerNote = sellerNote;
    }

    public String getDeclineReason() {
        return declineReason;
    }

    public void setDeclineReason(String declineReason) {
        this.declineReason = declineReason;
    }

    public BigDecimal getExpectedMin() {
        return expectedMin;
    }

    public void setExpectedMin(BigDecimal expectedMin) {
        this.expectedMin = expectedMin;
    }

    public BigDecimal getExpectedMax() {
        return expectedMax;
    }

    public void setExpectedMax(BigDecimal expectedMax) {
        this.expectedMax = expectedMax;
    }

    public BigDecimal getEstimatedFee() {
        return estimatedFee;
    }

    public void setEstimatedFee(BigDecimal estimatedFee) {
        this.estimatedFee = estimatedFee;
    }

    public Instant getPreQuotedAt() {
        return preQuotedAt;
    }

    public void setPreQuotedAt(Instant preQuotedAt) {
        this.preQuotedAt = preQuotedAt;
    }

    public Instant getAgreedAt() {
        return agreedAt;
    }

    public void setAgreedAt(Instant agreedAt) {
        this.agreedAt = agreedAt;
    }

    public Instant getReceivedAt() {
        return receivedAt;
    }

    public void setReceivedAt(Instant receivedAt) {
        this.receivedAt = receivedAt;
    }

    public String getIntakeNote() {
        return intakeNote;
    }

    public void setIntakeNote(String intakeNote) {
        this.intakeNote = intakeNote;
    }

    public BigDecimal getCleaningFee() {
        return cleaningFee;
    }

    public void setCleaningFee(BigDecimal cleaningFee) {
        this.cleaningFee = cleaningFee;
    }

    public Instant getQuotedAt() {
        return quotedAt;
    }

    public void setQuotedAt(Instant quotedAt) {
        this.quotedAt = quotedAt;
    }

    public String getFeePaymentRef() {
        return feePaymentRef;
    }

    public void setFeePaymentRef(String feePaymentRef) {
        this.feePaymentRef = feePaymentRef;
    }

    public Instant getFeePaidAt() {
        return feePaidAt;
    }

    public void setFeePaidAt(Instant feePaidAt) {
        this.feePaidAt = feePaidAt;
    }

    public Instant getCleanedAt() {
        return cleanedAt;
    }

    public void setCleanedAt(Instant cleanedAt) {
        this.cleanedAt = cleanedAt;
    }

    public Instant getListedAt() {
        return listedAt;
    }

    public void setListedAt(Instant listedAt) {
        this.listedAt = listedAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getExtendedAt() {
        return extendedAt;
    }

    public void setExtendedAt(Instant extendedAt) {
        this.extendedAt = extendedAt;
    }

    public Instant getPriceDroppedAt() {
        return priceDroppedAt;
    }

    public void setPriceDroppedAt(Instant priceDroppedAt) {
        this.priceDroppedAt = priceDroppedAt;
    }

    public Instant getExpiryRemindedAt() {
        return expiryRemindedAt;
    }

    public void setExpiryRemindedAt(Instant expiryRemindedAt) {
        this.expiryRemindedAt = expiryRemindedAt;
    }

    public String getReturnReason() {
        return returnReason;
    }

    public void setReturnReason(String returnReason) {
        this.returnReason = returnReason;
    }

    public Instant getReturnedAt() {
        return returnedAt;
    }

    public void setReturnedAt(Instant returnedAt) {
        this.returnedAt = returnedAt;
    }

    public Instant getClosedAt() {
        return closedAt;
    }

    public void setClosedAt(Instant closedAt) {
        this.closedAt = closedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public List<CareItem> getItems() {
        return items;
    }
}
