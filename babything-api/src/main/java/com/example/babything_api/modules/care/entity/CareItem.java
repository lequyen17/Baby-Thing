package com.example.babything_api.modules.care.entity;

import java.math.BigDecimal;
import java.time.Instant;

import org.hibernate.annotations.BatchSize;

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

import com.example.babything_api.modules.products.entity.AgeRange;

/** Một món trong lô ký gửi. Thông tin người bán khai báo, kết quả kiểm tra và tin đăng tạo ra khi lên sàn. */
@Entity
@Table(name = "care_items")
@BatchSize(size = 50)
public class CareItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "batch_id", nullable = false, updatable = false)
    private CareBatch batch;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 100)
    private String category;

    @Column(length = 30)
    private String size;

    @Enumerated(EnumType.STRING)
    @Column(name = "age_range", length = 20)
    private AgeRange ageRange;

    @Column(length = 100)
    private String brand;

    @Column(name = "desired_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal desiredPrice;

    @Column(name = "seller_description", length = 2000)
    private String sellerDescription;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CareItemStatus status = CareItemStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(length = 1)
    private CareGrade grade;

    @Column(length = 1000)
    private String defects;

    @Column(name = "reject_reason", length = 500)
    private String rejectReason;

    @Column(name = "list_price", precision = 12, scale = 2)
    private BigDecimal listPrice;

    @Column(name = "floor_price", precision = 12, scale = 2)
    private BigDecimal floorPrice;

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "sold_at")
    private Instant soldAt;

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

    public Long getId() {
        return id;
    }

    public CareBatch getBatch() {
        return batch;
    }

    void setBatch(CareBatch batch) {
        this.batch = batch;
    }

    public int getPosition() {
        return position;
    }

    void setPosition(int position) {
        this.position = position;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getSize() {
        return size;
    }

    public void setSize(String size) {
        this.size = size;
    }

    public AgeRange getAgeRange() {
        return ageRange;
    }

    public void setAgeRange(AgeRange ageRange) {
        this.ageRange = ageRange;
    }

    public String getBrand() {
        return brand;
    }

    public void setBrand(String brand) {
        this.brand = brand;
    }

    public BigDecimal getDesiredPrice() {
        return desiredPrice;
    }

    public void setDesiredPrice(BigDecimal desiredPrice) {
        this.desiredPrice = desiredPrice;
    }

    public String getSellerDescription() {
        return sellerDescription;
    }

    public void setSellerDescription(String sellerDescription) {
        this.sellerDescription = sellerDescription;
    }

    public String getPhotoUrl() {
        return photoUrl;
    }

    public void setPhotoUrl(String photoUrl) {
        this.photoUrl = photoUrl;
    }

    public CareItemStatus getStatus() {
        return status;
    }

    public void setStatus(CareItemStatus status) {
        this.status = status;
    }

    public CareGrade getGrade() {
        return grade;
    }

    public void setGrade(CareGrade grade) {
        this.grade = grade;
    }

    public String getDefects() {
        return defects;
    }

    public void setDefects(String defects) {
        this.defects = defects;
    }

    public String getRejectReason() {
        return rejectReason;
    }

    public void setRejectReason(String rejectReason) {
        this.rejectReason = rejectReason;
    }

    public BigDecimal getListPrice() {
        return listPrice;
    }

    public void setListPrice(BigDecimal listPrice) {
        this.listPrice = listPrice;
    }

    public BigDecimal getFloorPrice() {
        return floorPrice;
    }

    public void setFloorPrice(BigDecimal floorPrice) {
        this.floorPrice = floorPrice;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public Instant getSoldAt() {
        return soldAt;
    }

    public void setSoldAt(Instant soldAt) {
        this.soldAt = soldAt;
    }
}
