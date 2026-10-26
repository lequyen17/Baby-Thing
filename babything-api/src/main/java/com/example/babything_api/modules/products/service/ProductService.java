package com.example.babything_api.modules.products.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;

import com.example.babything_api.core.dto.PageResponse;
import com.example.babything_api.core.exceptions.ApiException;
import com.example.babything_api.modules.products.dto.ProductRequest;
import com.example.babything_api.modules.products.dto.ProductResponse;
import com.example.babything_api.modules.products.entity.Product;
import com.example.babything_api.modules.products.entity.ProductStatus;
import com.example.babything_api.modules.products.repository.ProductRepository;
import com.example.babything_api.modules.products.repository.ProductViewRepository;
import com.example.babything_api.modules.users.entity.Role;
import com.example.babything_api.modules.users.entity.User;

@Service
public class ProductService {

    public static final int MAX_PAGE_SIZE = 50;

    /** Chỉ cho sắp xếp theo các kiểu đã định sẵn, không nhận tên cột tuỳ ý từ client. */
    private static final Map<String, Sort> SORTS = Map.of(
            "newest", Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")),
            "oldest", Sort.by(Sort.Order.asc("createdAt"), Sort.Order.asc("id")),
            "price_asc", Sort.by(Sort.Order.asc("price"), Sort.Order.desc("id")),
            "price_desc", Sort.by(Sort.Order.desc("price"), Sort.Order.desc("id")),
            "name_asc", Sort.by(Sort.Order.asc("name"), Sort.Order.desc("id")),
            "name_desc", Sort.by(Sort.Order.desc("name"), Sort.Order.desc("id")));

    private final ProductRepository productRepository;
    private final ProductViewRepository viewRepository;

    public ProductService(ProductRepository productRepository, ProductViewRepository viewRepository) {
        this.productRepository = productRepository;
        this.viewRepository = viewRepository;
    }

    public record ListQuery(String q, String category, ProductStatus status, BigDecimal minPrice,
            BigDecimal maxPrice, String sort, int page, int size) {
    }

    // ---------------------------------------------------------------- Xem danh sách / chi tiết

    /** Khách chỉ thấy sản phẩm ACTIVE; admin thấy tất cả và lọc được theo status. */
    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> list(User viewer, ListQuery query) {
        Sort sort = SORTS.get(query.sort() == null ? "newest" : query.sort());
        if (sort == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SORT",
                    "Sort must be one of " + String.join(", ", SORTS.keySet()));
        }
        int page = Math.max(query.page(), 0);
        int size = Math.max(1, Math.min(query.size(), MAX_PAGE_SIZE));
        ProductStatus status = isAdmin(viewer) ? query.status() : ProductStatus.ACTIVE;
        return PageResponse.of(
                productRepository.findAll(filter(query, status), PageRequest.of(page, size, sort)),
                ProductResponse::from);
    }

    /** Mở trang chi tiết = một lượt xem, được ghi vào lịch sử của người đang đăng nhập. */
    @Transactional
    public ProductResponse view(User viewer, Long id) {
        Product product = findVisible(viewer, id);
        viewRepository.record(viewer.getId(), product.getId());
        return ProductResponse.from(product);
    }

    @Transactional(readOnly = true)
    public List<String> categories(User viewer) {
        List<ProductStatus> statuses = isAdmin(viewer)
                ? List.of(ProductStatus.values())
                : List.of(ProductStatus.ACTIVE);
        return productRepository.findCategories(statuses);
    }

    // ---------------------------------------------------------------- CRUD (admin)

    @Transactional
    public ProductResponse create(User admin, ProductRequest req) {
        String sku = normalizeSku(req.sku());
        if (productRepository.existsBySkuAndDeletedAtIsNull(sku)) {
            throw skuExists();
        }
        Product product = new Product();
        product.setCreatedBy(admin.getId());
        apply(product, req, sku, admin);
        return ProductResponse.from(save(product));
    }

    @Transactional
    public ProductResponse update(User admin, Long id, ProductRequest req) {
        Product product = findAlive(id);
        String sku = normalizeSku(req.sku());
        if (productRepository.existsBySkuAndDeletedAtIsNullAndIdNot(sku, id)) {
            throw skuExists();
        }
        apply(product, req, sku, admin);
        return ProductResponse.from(save(product));
    }

    /** Xoá mềm: sản phẩm biến mất khỏi mọi danh sách và lịch sử xem, SKU được giải phóng. */
    @Transactional
    public void delete(User admin, Long id) {
        Product product = findAlive(id);
        product.setDeletedAt(Instant.now());
        product.setUpdatedBy(admin.getId());
        productRepository.save(product);
    }

    // ---------------------------------------------------------------- Helpers

    Product findVisible(User viewer, Long id) {
        Product product = findAlive(id);
        if (!isAdmin(viewer) && product.getStatus() != ProductStatus.ACTIVE) {
            throw notFound();
        }
        return product;
    }

    Product findAlive(Long id) {
        return productRepository.findByIdAndDeletedAtIsNull(id).orElseThrow(ProductService::notFound);
    }

    static boolean isAdmin(User user) {
        return user.getRole() == Role.ADMIN;
    }

    private Product save(Product product) {
        try {
            return productRepository.saveAndFlush(product);
        } catch (DataIntegrityViolationException e) {
            // Hai request cùng tạo một SKU: lần kiểm tra exists ở trên không chặn được, index unique chặn
            throw skuExists();
        }
    }

    private static void apply(Product product, ProductRequest req, String sku, User admin) {
        product.setSku(sku);
        product.setName(req.name().trim());
        product.setDescription(blankToNull(req.description()));
        product.setPrice(req.price());
        product.setStock(req.stock());
        product.setCategory(blankToNull(req.category()));
        product.setImageUrl(blankToNull(req.imageUrl()));
        product.setStatus(req.status() == null ? ProductStatus.ACTIVE : req.status());
        product.setUpdatedBy(admin.getId());
    }

    private static Specification<Product> filter(ListQuery query, ProductStatus status) {
        return (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            String q = blankToNull(query.q());
            if (q != null) {
                String pattern = "%" + escapeLike(q.toLowerCase(Locale.ROOT)) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern, '\\'),
                        cb.like(cb.lower(root.get("sku")), pattern, '\\')));
            }
            String category = blankToNull(query.category());
            if (category != null) {
                predicates.add(cb.equal(root.get("category"), category));
            }
            if (query.minPrice() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("price"), query.minPrice()));
            }
            if (query.maxPrice() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("price"), query.maxPrice()));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private static String normalizeSku(String sku) {
        return sku.trim().toUpperCase(Locale.ROOT);
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product not found");
    }

    private static ApiException skuExists() {
        return new ApiException(HttpStatus.CONFLICT, "SKU_EXISTS", "Another product already uses this SKU");
    }
}
