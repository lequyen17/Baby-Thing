package com.example.babything_api.modules.messages.entity;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/** Người mua luôn là bên mở hội thoại; người bán là chủ tin đăng. Sản phẩm được chụp lại lúc mở. */
@Entity
@Table(name = "conversations")
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "buyer_id", nullable = false, updatable = false)
    private Long buyerId;

    @Column(name = "seller_id", nullable = false, updatable = false)
    private Long sellerId;

    @Column(name = "product_id", updatable = false)
    private Long productId;

    @Column(name = "product_name", length = 200)
    private String productName;

    @Column(name = "product_price", precision = 12, scale = 2)
    private BigDecimal productPrice;

    @Column(name = "product_category", length = 100)
    private String productCategory;

    @Column(name = "product_image_url", length = 500)
    private String productImageUrl;

    @Column(name = "buyer_blocked", nullable = false)
    private boolean buyerBlocked;

    @Column(name = "seller_blocked", nullable = false)
    private boolean sellerBlocked;

    @Column(name = "buyer_read_at")
    private Instant buyerReadAt;

    @Column(name = "seller_read_at")
    private Instant sellerReadAt;

    @Column(name = "last_message_at", nullable = false)
    private Instant lastMessageAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        if (lastMessageAt == null) {
            lastMessageAt = createdAt;
        }
        // Người mở hội thoại coi như đã đọc
        if (buyerReadAt == null) {
            buyerReadAt = createdAt;
        }
    }

    public boolean isBuyer(Long userId) {
        return buyerId.equals(userId);
    }

    public boolean isParticipant(Long userId) {
        return buyerId.equals(userId) || sellerId.equals(userId);
    }

    public Long peerOf(Long userId) {
        return isBuyer(userId) ? sellerId : buyerId;
    }

    public boolean isBlockedBy(Long userId) {
        return isBuyer(userId) ? buyerBlocked : sellerBlocked;
    }

    public boolean isBlockedByPeer(Long userId) {
        return isBuyer(userId) ? sellerBlocked : buyerBlocked;
    }

    public void setBlockedBy(Long userId, boolean blocked) {
        if (isBuyer(userId)) {
            buyerBlocked = blocked;
        } else {
            sellerBlocked = blocked;
        }
    }

    public Instant readAtOf(Long userId) {
        return isBuyer(userId) ? buyerReadAt : sellerReadAt;
    }

    public void setReadAt(Long userId, Instant at) {
        if (isBuyer(userId)) {
            buyerReadAt = at;
        } else {
            sellerReadAt = at;
        }
    }

    public Long getId() {
        return id;
    }

    public Long getBuyerId() {
        return buyerId;
    }

    public void setBuyerId(Long buyerId) {
        this.buyerId = buyerId;
    }

    public Long getSellerId() {
        return sellerId;
    }

    public void setSellerId(Long sellerId) {
        this.sellerId = sellerId;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public BigDecimal getProductPrice() {
        return productPrice;
    }

    public void setProductPrice(BigDecimal productPrice) {
        this.productPrice = productPrice;
    }

    public String getProductCategory() {
        return productCategory;
    }

    public void setProductCategory(String productCategory) {
        this.productCategory = productCategory;
    }

    public String getProductImageUrl() {
        return productImageUrl;
    }

    public void setProductImageUrl(String productImageUrl) {
        this.productImageUrl = productImageUrl;
    }

    public Instant getLastMessageAt() {
        return lastMessageAt;
    }

    public void setLastMessageAt(Instant lastMessageAt) {
        this.lastMessageAt = lastMessageAt;
    }
}
