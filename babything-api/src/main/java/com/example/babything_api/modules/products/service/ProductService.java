package com.example.babything_api.modules.products.service;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

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

    private static final String SKU_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final ProductRepository productRepository;
    private final ProductViewRepository viewRepository;

    public ProductService(ProductRepository productRepository, ProductViewRepository viewRepository) {
        this.productRepository = productRepository;
        this.viewRepository = viewRepository;
    }

    /**
     * mine = chỉ tin đăng của người đang xem (thấy cả tin đang ẩn).
     * sellerId = tin của một người bán (hồ sơ người bán); như danh sách chung, khách chỉ thấy tin ACTIVE.
     */
    public record ListQuery(String q, String category, ProductStatus status, BigDecimal minPrice,
            BigDecimal maxPrice, boolean mine, Long sellerId, String sort, int page, int size) {
    }

    // ---------------------------------------------------------------- Xem danh sách / chi tiết

    /** Khách chỉ thấy sản phẩm ACTIVE; admin và người bán (với tin của mình) thấy tất cả, lọc được theo status. */
    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> list(User viewer, ListQuery query) {
        Sort sort = SORTS.get(query.sort() == null ? "newest" : query.sort());
        if (sort == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SORT",
                    "Kiểu sắp xếp phải là một trong: " + String.join(", ", SORTS.keySet()));
        }
        int page = Math.max(query.page(), 0);
        int size = Math.max(1, Math.min(query.size(), MAX_PAGE_SIZE));
        ProductStatus status = isAdmin(viewer) || query.mine() ? query.status() : ProductStatus.ACTIVE;
        Long sellerId = query.mine() ? viewer.getId() : query.sellerId();
        return PageResponse.of(
                productRepository.findAll(filter(query, status, sellerId), PageRequest.of(page, size, sort)),
                ProductResponse::from);
    }

    /** Mở trang chi tiết = một lượt xem, được ghi vào lịch sử của người đang đăng nhập (trừ người bán xem tin mình). */
    @Transactional
    public ProductResponse view(User viewer, Long id) {
        Product product = findVisible(viewer, id);
        if (!Objects.equals(product.getCreatedBy(), viewer.getId())) {
            viewRepository.record(viewer.getId(), product.getId());
        }
        return ProductResponse.from(product);
    }

    @Transactional(readOnly = true)
    public List<String> categories(User viewer) {
        List<ProductStatus> statuses = isAdmin(viewer)
                ? List.of(ProductStatus.values())
                : List.of(ProductStatus.ACTIVE);
        return productRepository.findCategories(statuses);
    }

    // ---------------------------------------------------------------- CRUD (mọi thành viên; sửa/xoá: chủ tin hoặc admin)

    @Transactional
    public ProductResponse create(User seller, ProductRequest req) {
        String sku = blankToNull(req.sku()) == null ? generateSku() : normalizeSku(req.sku());
        if (productRepository.existsBySkuAndDeletedAtIsNull(sku)) {
            throw skuExists();
        }
        Product product = new Product();
        product.setCreatedBy(seller.getId());
        product.setSeller(seller);
        apply(product, req, sku, seller);
        product.setStock(req.stock());
        return ProductResponse.from(save(product));
    }

    /** sku để trống thì giữ SKU cũ. Có previousStock thì tồn kho được sửa theo phần chênh lệch (xem ProductRequest). */
    @Transactional
    public ProductResponse update(User user, Long id, ProductRequest req) {
        Product product = checkManageable(user,
                productRepository.findAliveForUpdate(id).orElseThrow(ProductService::notFound));
        String sku = blankToNull(req.sku()) == null ? product.getSku() : normalizeSku(req.sku());
        if (productRepository.existsBySkuAndDeletedAtIsNullAndIdNot(sku, id)) {
            throw skuExists();
        }
        int stock = req.previousStock() == null
                ? req.stock()
                : product.getStock() + (req.stock() - req.previousStock());
        if (stock < 0) {
            throw new ApiException(HttpStatus.CONFLICT, "STOCK_CHANGED",
                    "Số lượng đã thay đổi trong lúc bạn sửa (hiện còn " + product.getStock() + "). Vui lòng kiểm tra lại");
        }
        apply(product, req, sku, user);
        product.setStock(stock);
        return ProductResponse.from(save(product));
    }

    /**
     * Xoá mềm: sản phẩm biến mất khỏi mọi danh sách và lịch sử xem, SKU được giải phóng.
     * Khoá dòng như update: save ghi lại cả cột stock, không khoá thì đè mất phần đơn hàng vừa trừ.
     */
    @Transactional
    public void delete(User user, Long id) {
        Product product = checkManageable(user,
                productRepository.findAliveForUpdate(id).orElseThrow(ProductService::notFound));
        product.setDeletedAt(Instant.now());
        product.setUpdatedBy(user.getId());
        productRepository.save(product);
    }

    // ---------------------------------------------------------------- Helpers

    Product findVisible(User viewer, Long id) {
        return checkVisible(viewer, findAlive(id));
    }

    Product findManageable(User user, Long id) {
        return checkManageable(user, findAlive(id));
    }

    private static Product checkVisible(User viewer, Product product) {
        if (product.getStatus() != ProductStatus.ACTIVE && !canManage(viewer, product)) {
            throw notFound();
        }
        return product;
    }

    /** Tin ẩn của người khác coi như không tồn tại; tin đang hiện thì báo không có quyền. */
    private static Product checkManageable(User user, Product product) {
        checkVisible(user, product);
        if (!canManage(user, product)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "NOT_PRODUCT_OWNER",
                    "Chỉ người bán hoặc quản trị viên mới sửa được tin đăng này");
        }
        return product;
    }

    Product findAlive(Long id) {
        return productRepository.findByIdAndDeletedAtIsNull(id).orElseThrow(ProductService::notFound);
    }

    static boolean isAdmin(User user) {
        return user.getRole() == Role.ADMIN;
    }

    static boolean canManage(User user, Product product) {
        return isAdmin(user) || Objects.equals(product.getCreatedBy(), user.getId());
    }

    private Product save(Product product) {
        try {
            return productRepository.saveAndFlush(product);
        } catch (DataIntegrityViolationException e) {
            // Hai request cùng tạo một SKU: lần kiểm tra exists ở trên không chặn được, index unique chặn
            throw skuExists();
        }
    }

    private static void apply(Product product, ProductRequest req, String sku, User editor) {
        product.setSku(sku);
        product.setName(req.name().trim());
        product.setDescription(blankToNull(req.description()));
        product.setPrice(req.price());
        product.setCategory(blankToNull(req.category()));
        product.setImageUrl(blankToNull(req.imageUrl()));
        product.setCondition(req.condition());
        product.setStatus(req.status() == null ? ProductStatus.ACTIVE : req.status());
        product.setUpdatedBy(editor.getId());
    }

    private static Specification<Product> filter(ListQuery query, ProductStatus status, Long sellerId) {
        return (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));
            if (sellerId != null) {
                predicates.add(cb.equal(root.get("createdBy"), sellerId));
            }
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

    /** Người bán đồ cũ thường không có SKU: sinh mã dạng BT-XXXXXXXX, trùng thì index unique chặn. */
    private static String generateSku() {
        StringBuilder sku = new StringBuilder("BT-");
        for (int i = 0; i < 8; i++) {
            sku.append(SKU_ALPHABET.charAt(RANDOM.nextInt(SKU_ALPHABET.length())));
        }
        return sku.toString();
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
        return new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm");
    }

    private static ApiException skuExists() {
        return new ApiException(HttpStatus.CONFLICT, "SKU_EXISTS", "Mã SKU này đã được sản phẩm khác sử dụng");
    }
}
