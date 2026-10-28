package com.example.babything_api.modules.orders.repository;

import java.time.Instant;
import java.util.List;
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
import com.example.babything_api.modules.orders.entity.OrderStatus;

public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {

    /** Nạp kèm người mua và người bán để trang danh sách không truy vấn users từng dòng. */
    @Override
    @EntityGraph(attributePaths = { "user", "seller" })
    Page<Order> findAll(Specification<Order> spec, Pageable pageable);

    @EntityGraph(attributePaths = { "user", "seller", "items" })
    @Query("select o from ShopOrder o where o.id = :id")
    Optional<Order> findDetail(@Param("id") Long id);

    /** Khoá dòng đơn khi sửa / huỷ / đổi trạng thái để hai thao tác không cùng hoàn kho hai lần. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from ShopOrder o where o.id = :id")
    Optional<Order> findForUpdate(@Param("id") Long id);

    /** Thống kê trang quản trị: [status, số đơn, tổng tiền]. */
    @Query("select o.status, count(o), coalesce(sum(o.totalAmount), 0) from ShopOrder o group by o.status")
    List<Object[]> countByStatus();

    /** Job: đơn chưa thanh toán đã quá hạn. */
    @Query("select o.id from ShopOrder o where o.status = :status and o.paymentDueAt < :before order by o.id")
    List<Long> findIdsByStatusAndPaymentDueAtBefore(@Param("status") OrderStatus status,
            @Param("before") Instant before);

    /** Job: đơn đã giao trước mốc này (hết thời hạn kiểm hàng). */
    @Query("select o.id from ShopOrder o where o.status = :status and o.deliveredAt < :before order by o.id")
    List<Long> findIdsByStatusAndDeliveredAtBefore(@Param("status") OrderStatus status,
            @Param("before") Instant before);
}
