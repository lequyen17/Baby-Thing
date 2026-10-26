package com.example.babything_api.modules.products.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.babything_api.modules.products.entity.ProductView;

public interface ProductViewRepository extends JpaRepository<ProductView, Long> {

    /** Upsert để hai request xem cùng lúc không tạo trùng dòng. */
    @Modifying
    @Query(value = """
            INSERT INTO product_views (user_id, product_id) VALUES (:userId, :productId)
            ON CONFLICT (user_id, product_id)
            DO UPDATE SET view_count = product_views.view_count + 1, last_viewed_at = now()""",
            nativeQuery = true)
    void record(@Param("userId") Long userId, @Param("productId") Long productId);

    /** Lịch sử của một user, bỏ qua sản phẩm đã xoá. */
    @Query(value = """
            select v from ProductView v join fetch v.product p
            where v.user.id = :userId and p.deletedAt is null
            order by v.lastViewedAt desc""",
            countQuery = """
            select count(v) from ProductView v
            where v.user.id = :userId and v.product.deletedAt is null""")
    Page<ProductView> findHistory(@Param("userId") Long userId, Pageable pageable);

    /** Những ai đã xem một sản phẩm (cho admin). */
    @Query(value = """
            select v from ProductView v join fetch v.user
            where v.product.id = :productId
            order by v.lastViewedAt desc""",
            countQuery = "select count(v) from ProductView v where v.product.id = :productId")
    Page<ProductView> findViewers(@Param("productId") Long productId, Pageable pageable);

    @Query("select coalesce(sum(v.viewCount), 0) from ProductView v where v.product.id = :productId")
    long sumViews(@Param("productId") Long productId);

    @Modifying
    @Query("delete from ProductView v where v.user.id = :userId and v.product.id = :productId")
    int deleteEntry(@Param("userId") Long userId, @Param("productId") Long productId);

    @Modifying
    @Query("delete from ProductView v where v.user.id = :userId")
    int deleteAllForUser(@Param("userId") Long userId);
}
