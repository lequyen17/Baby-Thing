package com.example.babything_api.modules.settlements.repository;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;

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

import com.example.babything_api.modules.settlements.entity.Settlement;
import com.example.babything_api.modules.settlements.entity.SettlementStatus;

public interface SettlementRepository extends JpaRepository<Settlement, Long>, JpaSpecificationExecutor<Settlement> {

    @Override
    @EntityGraph(attributePaths = { "order", "seller" })
    Page<Settlement> findAll(Specification<Settlement> spec, Pageable pageable);

    boolean existsByOrderId(Long orderId);

    /** Khoá theo thứ tự id để hai lần chi trả cùng lúc không trả trùng. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = { "order", "seller" })
    @Query("select s from Settlement s where s.id in :ids order by s.id")
    List<Settlement> findAllForUpdate(@Param("ids") Collection<Long> ids);

    /** Tổng theo trạng thái của một người bán; sumAll là toàn sàn. */
    @Query("select s.status as status, count(s) as count, coalesce(sum(s.netAmount), 0) as netAmount, "
            + "coalesce(sum(s.commissionAmount), 0) as commissionAmount "
            + "from Settlement s where s.seller.id = :sellerId group by s.status")
    List<StatusTotal> sumBySeller(@Param("sellerId") Long sellerId);

    @Query("select s.status as status, count(s) as count, coalesce(sum(s.netAmount), 0) as netAmount, "
            + "coalesce(sum(s.commissionAmount), 0) as commissionAmount "
            + "from Settlement s group by s.status")
    List<StatusTotal> sumAll();

    interface StatusTotal {
        SettlementStatus getStatus();

        long getCount();

        BigDecimal getNetAmount();

        BigDecimal getCommissionAmount();
    }
}
