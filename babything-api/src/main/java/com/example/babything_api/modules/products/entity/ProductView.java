package com.example.babything_api.modules.products.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import com.example.babything_api.modules.users.entity.User;

/** Chỉ đọc qua JPA; ghi bằng upsert native trong ProductViewRepository.record. */
@Entity
@Table(name = "product_views")
public class ProductView {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "view_count", nullable = false)
    private int viewCount;

    @Column(name = "first_viewed_at", nullable = false)
    private Instant firstViewedAt;

    @Column(name = "last_viewed_at", nullable = false)
    private Instant lastViewedAt;

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public Product getProduct() {
        return product;
    }

    public int getViewCount() {
        return viewCount;
    }

    public Instant getFirstViewedAt() {
        return firstViewedAt;
    }

    public Instant getLastViewedAt() {
        return lastViewedAt;
    }
}
