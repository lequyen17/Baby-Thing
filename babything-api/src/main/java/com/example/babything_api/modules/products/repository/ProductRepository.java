package com.example.babything_api.modules.products.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.babything_api.modules.products.entity.Product;
import com.example.babything_api.modules.products.entity.ProductStatus;

public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    Optional<Product> findByIdAndDeletedAtIsNull(Long id);

    boolean existsBySkuAndDeletedAtIsNull(String sku);

    boolean existsBySkuAndDeletedAtIsNullAndIdNot(String sku, Long id);

    /** statuses rỗng không được phép, nên gọi với danh sách trạng thái người dùng được xem. */
    @Query("""
            select distinct p.category from Product p
            where p.deletedAt is null and p.category is not null and p.status in :statuses
            order by p.category""")
    List<String> findCategories(@Param("statuses") List<ProductStatus> statuses);
}
