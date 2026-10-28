package com.example.babything_api.modules.orders.entity;

import java.math.BigDecimal;
import java.util.List;

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
import jakarta.persistence.Table;

import com.example.babything_api.modules.products.entity.AgeRange;
import com.example.babything_api.modules.products.entity.Product;
import com.example.babything_api.modules.products.entity.ProductCondition;

/** Ảnh chụp sản phẩm lúc đặt: sửa/xoá sản phẩm sau đó không làm đổi đơn. */
@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "product_name", nullable = false, length = 200)
    private String productName;

    @Column(name = "product_sku", nullable = false, length = 64)
    private String productSku;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "line_total", nullable = false, precision = 14, scale = 2)
    private BigDecimal lineTotal;

    // Bản chụp tin đăng lúc mua: người mua đối chiếu khi kiểm hàng, admin dùng khi xử lý khiếu nại
    private String description;

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

    @Column(length = 1000)
    private String defects;

    @Column(name = "usage_duration", length = 50)
    private String usageDuration;

    /** Các URL ảnh cách nhau bằng xuống dòng. */
    @Column(name = "image_urls")
    private String imageUrls;

    /** Chụp lại toàn bộ nội dung tin đăng tại thời điểm đặt. */
    public void snapshot(Product product) {
        productName = product.getName();
        productSku = product.getSku();
        imageUrl = product.getImageUrl();
        unitPrice = product.getPrice();
        description = product.getDescription();
        condition = product.getCondition();
        brand = product.getBrand();
        ageRange = product.getAgeRange();
        size = product.getSize();
        defects = product.getDefects();
        usageDuration = product.getUsageDuration();
        imageUrls = product.getImageUrls().isEmpty() ? null : String.join("\n", product.getImageUrls());
    }

    /** Dùng khi sửa đơn: dòng cũ nhận nội dung của dòng vừa chụp lại. */
    public void copySnapshot(OrderItem other) {
        productName = other.productName;
        productSku = other.productSku;
        imageUrl = other.imageUrl;
        unitPrice = other.unitPrice;
        description = other.description;
        condition = other.condition;
        brand = other.brand;
        ageRange = other.ageRange;
        size = other.size;
        defects = other.defects;
        usageDuration = other.usageDuration;
        imageUrls = other.imageUrls;
    }

    public String getDescription() {
        return description;
    }

    public ProductCondition getCondition() {
        return condition;
    }

    public String getBrand() {
        return brand;
    }

    public AgeRange getAgeRange() {
        return ageRange;
    }

    public String getSize() {
        return size;
    }

    public String getDefects() {
        return defects;
    }

    public String getUsageDuration() {
        return usageDuration;
    }

    public List<String> getImageUrls() {
        return imageUrls == null ? List.of() : List.of(imageUrls.split("\n"));
    }

    public Long getId() {
        return id;
    }

    public Order getOrder() {
        return order;
    }

    void setOrder(Order order) {
        this.order = order;
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

    public String getProductSku() {
        return productSku;
    }

    public void setProductSku(String productSku) {
        this.productSku = productSku;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getLineTotal() {
        return lineTotal;
    }

    public void setLineTotal(BigDecimal lineTotal) {
        this.lineTotal = lineTotal;
    }
}
