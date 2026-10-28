package com.example.babything_api.modules.payments.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.babything_api.modules.payments.entity.Payment;
import com.example.babything_api.modules.payments.entity.PaymentStatus;

public interface PaymentRepository extends JpaRepository<Payment, Long>, JpaSpecificationExecutor<Payment> {

    /** Nạp kèm đơn và người bán để hiển thị tóm tắt đơn trên từng dòng; items của đơn đã có @BatchSize. */
    @Override
    @EntityGraph(attributePaths = { "order", "order.seller" })
    Page<Payment> findAll(Specification<Payment> spec, Pageable pageable);

    @EntityGraph(attributePaths = { "user", "order", "order.seller", "order.items" })
    @Query("select p from Payment p where p.id = :id")
    Optional<Payment> findDetail(@Param("id") Long id);

    /** Số giao dịch và tổng tiền theo từng trạng thái của một người mua. */
    @Query("select p.status as status, count(p) as count, coalesce(sum(p.amount), 0) as amount "
            + "from Payment p where p.user.id = :userId group by p.status")
    List<StatusTotal> sumByStatus(@Param("userId") Long userId);

    interface StatusTotal {
        PaymentStatus getStatus();

        long getCount();

        BigDecimal getAmount();
    }
}
