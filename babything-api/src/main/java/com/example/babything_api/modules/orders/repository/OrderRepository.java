package com.example.babything_api.modules.orders.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import com.example.babything_api.modules.orders.entity.Order;

public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {

    /** Nạp kèm khách hàng để trang danh sách không truy vấn users từng dòng. */
    @Override
    @EntityGraph(attributePaths = "user")
    Page<Order> findAll(Specification<Order> spec, Pageable pageable);

    @EntityGraph(attributePaths = { "user", "items" })
    @Query("select o from ShopOrder o where o.id = :id")
    Optional<Order> findDetail(@Param("id") Long id);

    /** Khoá dòng đơn khi sửa / huỷ / đổi trạng thái để hai thao tác không cùng hoàn kho hai lần. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from ShopOrder o where o.id = :id")
    Optional<Order> findForUpdate(@Param("id") Long id);
}
