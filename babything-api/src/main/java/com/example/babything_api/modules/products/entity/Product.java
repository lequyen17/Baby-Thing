package com.example.babything_api.modules.products.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.BatchSize;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import com.example.babything_api.modules.care.entity.CareItem;
import com.example.babything_api.modules.users.entity.User;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 64)
    private String sku;

    @Column(nullable = false, length = 200)
    private String name;

    private String description;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    private int stock;

    @Column(length = 100)
    private String category;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductStatus status = ProductStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_condition", length = 20)
    private ProductCondition condition;

    @Column(length = 100)
    private String brand;

    @Enumerated(EnumType.STRING)
    @Column(name = "age_range", length = 20)
    private AgeRange ageRange;

    @Column(length = 30)
    private String size;

    /** Lỗi / khuyết điểm người bán khai báo ("Không có" nếu không có). */
    @Column(length = 1000)
    private String defects;

    @Column(name = "usage_duration", length = 50)
    private String usageDuration;

    /** Ảnh thật theo thứ tự hiển thị; imageUrl luôn là ảnh đầu tiên. */
    @ElementCollection
    @CollectionTable(name = "product_images", joinColumns = @JoinColumn(name = "product_id"))
    @OrderColumn(name = "position")
    @Column(name = "url", length = 500)
    @BatchSize(size = 50)
    private List<String> imageUrls = new ArrayList<>();

    @Column(name = "reject_reason", length = 500)
    private String rejectReason;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    /** null = nội dung hiện tại chưa được admin duyệt. */
    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    /** Người bán (chủ tin đăng). */
    @Column(name = "created_by", updatable = false)
    private Long createdBy;

    /** Chỉ đọc, để lấy tên người bán; ghi qua createdBy. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", insertable = false, updatable = false)
    private User seller;

    @Column(name = "updated_by")
    private Long updatedBy;

    /** Tin tạo từ một món ký gửi Care (nhãn BabyThings Renewed); null = tin tự đăng. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "care_item_id")
    private CareItem careItem;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

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

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public int getStock() {
        return stock;
    }

    public void setStock(int stock) {
        this.stock = stock;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public ProductStatus getStatus() {
        return status;
    }

    public void setStatus(ProductStatus status) {
        this.status = status;
    }

    public ProductCondition getCondition() {
        return condition;
    }

    public void setCondition(ProductCondition condition) {
        this.condition = condition;
    }

    public String getBrand() {
        return brand;
    }

    public void setBrand(String brand) {
        this.brand = brand;
    }

    public AgeRange getAgeRange() {
        return ageRange;
    }

    public void setAgeRange(AgeRange ageRange) {
        this.ageRange = ageRange;
    }

    public String getSize() {
        return size;
    }

    /** Chuẩn hoá để bộ lọc size không tách "80cm" và "80" thành hai lựa chọn (xem ItemSize). */
    public void setSize(String size) {
        this.size = ItemSize.normalize(size);
    }

    public String getDefects() {
        return defects;
    }

    public void setDefects(String defects) {
        this.defects = defects;
    }

    public String getUsageDuration() {
        return usageDuration;
    }

    public void setUsageDuration(String usageDuration) {
        this.usageDuration = usageDuration;
    }

    public List<String> getImageUrls() {
        return imageUrls;
    }

    /** Thay danh sách ảnh và cập nhật ảnh bìa. */
    public void replaceImages(List<String> urls) {
        imageUrls.clear();
        imageUrls.addAll(urls);
        imageUrl = urls.isEmpty() ? null : urls.get(0);
    }

    public String getRejectReason() {
        return rejectReason;
    }

    public void setRejectReason(String rejectReason) {
        this.rejectReason = rejectReason;
    }

    public Long getReviewedBy() {
        return reviewedBy;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    /** reviewer null = huỷ trạng thái đã duyệt (người bán vừa sửa nội dung). */
    public void markReviewed(Long reviewer) {
        reviewedBy = reviewer;
        reviewedAt = reviewer == null ? null : Instant.now();
    }

    public User getSeller() {
        return seller;
    }

    /** Gán cùng createdBy khi tạo mới để response có ngay tên người bán. */
    public void setSeller(User seller) {
        this.seller = seller;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }

    public Long getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(Long updatedBy) {
        this.updatedBy = updatedBy;
    }

    public CareItem getCareItem() {
        return careItem;
    }

    public void setCareItem(CareItem careItem) {
        this.careItem = careItem;
    }

    public boolean isCare() {
        return careItem != null;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Instant deletedAt) {
        this.deletedAt = deletedAt;
    }
}
