package com.example.babything_api.modules.cart.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.babything_api.modules.cart.entity.CartItem;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    /** Nạp kèm sản phẩm và người bán để dựng cả giỏ trong một truy vấn. */
    @EntityGraph(attributePaths = { "product", "product.seller" })
    List<CartItem> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<CartItem> findByUserIdAndProductId(Long userId, Long productId);

    long countByUserId(Long userId);

    @Modifying
    @Query("delete from CartItem c where c.userId = :userId and c.product.id in :productIds")
    int deleteByUserIdAndProductIds(@Param("userId") Long userId, @Param("productIds") Collection<Long> productIds);

    @Modifying
    @Query("delete from CartItem c where c.userId = :userId")
    int deleteAllByUserId(@Param("userId") Long userId);
}
