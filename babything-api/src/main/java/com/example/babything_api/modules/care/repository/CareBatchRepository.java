package com.example.babything_api.modules.care.repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
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

import com.example.babything_api.modules.care.entity.CareBatch;
import com.example.babything_api.modules.care.entity.CareBatchStatus;

public interface CareBatchRepository extends JpaRepository<CareBatch, Long>, JpaSpecificationExecutor<CareBatch> {

    @Override
    @EntityGraph(attributePaths = "seller")
    Page<CareBatch> findAll(Specification<CareBatch> spec, Pageable pageable);

    @EntityGraph(attributePaths = { "seller", "items" })
    @Query("select b from CareBatch b where b.id = :id")
    Optional<CareBatch> findDetail(@Param("id") Long id);

    /** Khoá lô khi chuyển bước để hai thao tác (người bán / admin / job) không chạy chồng lên nhau. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from CareBatch b where b.id = :id")
    Optional<CareBatch> findForUpdate(@Param("id") Long id);

    long countByStatusIn(Collection<CareBatchStatus> statuses);

    long countByPreQuotedAtGreaterThanEqual(Instant from);

    @Query("select b.status, count(b) from CareBatch b group by b.status")
    List<Object[]> countByStatus();

    @Query("select coalesce(sum(b.cleaningFee), 0) from CareBatch b where b.feePaidAt is not null")
    BigDecimal sumFeesCollected();

    // ---------------------------------------------------------------- Job

    @Query("""
            select b.id from CareBatch b
            where b.status = com.example.babything_api.modules.care.entity.CareBatchStatus.SELLING
            and b.priceDroppedAt is null and b.listedAt < :before""")
    List<Long> findIdsForPriceDrop(@Param("before") Instant before);

    @Query("""
            select b.id from CareBatch b
            where b.status = com.example.babything_api.modules.care.entity.CareBatchStatus.SELLING
            and b.expiryRemindedAt is null and b.expiresAt < :before""")
    List<Long> findIdsForReminder(@Param("before") Instant before);

    @Query("""
            select b.id from CareBatch b
            where b.status = com.example.babything_api.modules.care.entity.CareBatchStatus.SELLING
            and b.expiresAt < :now""")
    List<Long> findIdsExpired(@Param("now") Instant now);
}
