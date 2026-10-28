package com.example.babything_api.modules.products.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import com.example.babything_api.modules.products.entity.Product;
import com.example.babything_api.modules.products.entity.ProductStatus;

public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    /** Nạp luôn người bán, tránh N+1 khi dựng ProductResponse cho cả trang. */
    @Override
    @EntityGraph(attributePaths = "seller")
    Page<Product> findAll(Specification<Product> spec, Pageable pageable);

    Optional<Product> findByIdAndDeletedAtIsNull(Long id);

    /** Khoá dòng khi sửa tin để đơn hàng không trừ kho xen giữa lúc đọc và ghi lại tồn kho. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id = :id and p.deletedAt is null")
    Optional<Product> findAliveForUpdate(@Param("id") Long id);

    boolean existsBySkuAndDeletedAtIsNull(String sku);

    boolean existsBySkuAndDeletedAtIsNullAndIdNot(String sku, Long id);

    /** statuses rỗng không được phép, nên gọi với danh sách trạng thái người dùng được xem. */
    @Query("""
            select distinct p.category from Product p
            where p.deletedAt is null and p.category is not null and p.status in :statuses
            order by p.category""")
    List<String> findCategories(@Param("statuses") List<ProductStatus> statuses);

    /**
     * Trừ kho cho đơn hàng trong một câu UPDATE có điều kiện, nên hai đơn cùng lúc không thể bán quá tồn kho.
     * Trả về 0 khi sản phẩm không còn bán hoặc không đủ hàng.
     */
    @Modifying
    @Query("""
            update Product p set p.stock = p.stock - :quantity
            where p.id = :id and p.stock >= :quantity and p.deletedAt is null
            and p.status = com.example.babything_api.modules.products.entity.ProductStatus.ACTIVE""")
    int decreaseStock(@Param("id") Long id, @Param("quantity") int quantity);

    /** Hoàn kho khi huỷ / sửa đơn, kể cả khi sản phẩm đã bị ẩn hoặc xoá mềm. */
    @Modifying
    @Query("update Product p set p.stock = p.stock + :quantity where p.id = :id")
    int increaseStock(@Param("id") Long id, @Param("quantity") int quantity);
}
