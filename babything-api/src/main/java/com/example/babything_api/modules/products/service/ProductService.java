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

    /** Số ảnh thật tối thiểu cho tin của thành viên. */
    public static final int MIN_IMAGES = 3;

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
        checkComplete(seller, req);
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
        checkComplete(user, req);
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

    // ---------------------------------------------------------------- Hiển thị / kiểm duyệt

    /**
     * Ẩn tin, hoặc hiện lại tin đã duyệt. Tin chưa duyệt (vd. lưu ở chế độ ẩn) mà bật hiển thị thì được gửi duyệt.
     * Tin bị từ chối phải sửa lại (PUT) mới gửi duyệt được.
     */
    @Transactional
    public ProductResponse setVisibility(User user, Long id, boolean visible) {
        Product product = checkManageable(user,
                productRepository.findAliveForUpdate(id).orElseThrow(ProductService::notFound));
        if (product.getStatus() == ProductStatus.REJECTED) {
            throw new ApiException(HttpStatus.CONFLICT, "PRODUCT_REJECTED",
                    "Tin đã bị từ chối. Vui lòng sửa lại theo góp ý để gửi duyệt lại");
        }
        if (!visible) {
            product.setStatus(ProductStatus.INACTIVE);
        } else if (product.getReviewedAt() != null) {
            product.setStatus(ProductStatus.ACTIVE);
        } else {
            product.setStatus(ProductStatus.PENDING_REVIEW);
        }
        product.setUpdatedBy(user.getId());
        return ProductResponse.from(productRepository.saveAndFlush(product));
    }

    @Transactional
    public ProductResponse approve(User admin, Long id) {
        Product product = findForReview(admin, id);
        if (product.getStatus() != ProductStatus.PENDING_REVIEW) {
            throw new ApiException(HttpStatus.CONFLICT, "NOT_PENDING_REVIEW", "Tin này không ở trạng thái chờ duyệt");
        }
        product.setStatus(ProductStatus.ACTIVE);
        product.setRejectReason(null);
        product.markReviewed(admin.getId());
        return ProductResponse.from(productRepository.saveAndFlush(product));
    }

    /** Từ chối tin chờ duyệt, hoặc gỡ tin đang bán khi hậu kiểm phát hiện vi phạm. */
    @Transactional
    public ProductResponse reject(User admin, Long id, String reason) {
        String trimmed = blankToNull(reason);
        if (trimmed == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "REASON_REQUIRED",
                    "Vui lòng ghi lý do để người bán biết cần sửa gì");
        }
        Product product = findForReview(admin, id);
        if (product.getStatus() == ProductStatus.REJECTED) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_REJECTED", "Tin này đã bị từ chối");
        }
        product.setStatus(ProductStatus.REJECTED);
        product.setRejectReason(trimmed);
        product.markReviewed(null);
        product.setUpdatedBy(admin.getId());
        return ProductResponse.from(productRepository.saveAndFlush(product));
    }

    @Transactional(readOnly = true)
    public long countPendingReview(User admin) {
        requireAdmin(admin);
        return productRepository.countByStatusAndDeletedAtIsNull(ProductStatus.PENDING_REVIEW);
    }

    private Product findForReview(User admin, Long id) {
        requireAdmin(admin);
        return productRepository.findAliveForUpdate(id).orElseThrow(ProductService::notFound);
    }

    private static void requireAdmin(User user) {
        if (!isAdmin(user)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_ONLY", "Chỉ quản trị viên mới kiểm duyệt tin đăng");
        }
    }

    // ---------------------------------------------------------------- Helpers

    /**
     * Form đăng bán chuẩn hoá (tài liệu BMC 7.3.2): thành viên phải khai tình trạng, độ tuổi, lỗi / khuyết điểm
     * và đủ ảnh thật. Admin được bỏ qua để nhập nhanh hàng mẫu.
     */
    private static void checkComplete(User user, ProductRequest req) {
        if (isAdmin(user)) {
            return;
        }
        List<String> missing = new ArrayList<>();
        if (req.condition() == null) {
            missing.add("tình trạng");
        }
        if (req.ageRange() == null) {
            missing.add("độ tuổi phù hợp");
        }
        if (blankToNull(req.defects()) == null) {
            missing.add("lỗi / khuyết điểm (ghi \"Không có\" nếu không có)");
        }
        if (!missing.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "LISTING_INCOMPLETE",
                    "Vui lòng khai báo " + String.join(", ", missing));
        }
        if (req.imageUrls() == null || req.imageUrls().size() < MIN_IMAGES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "NOT_ENOUGH_IMAGES",
                    "Cần tối thiểu " + MIN_IMAGES + " ảnh thật của sản phẩm, gồm ảnh cận lỗi nếu có");
        }
    }

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

    /**
     * Admin tạo / sửa thì tin coi như đã duyệt. Thành viên tạo / sửa thì nội dung mới phải được duyệt lại:
     * chọn hiển thị = gửi duyệt (PENDING_REVIEW), chọn ẩn = lưu ẩn, gửi duyệt sau qua setVisibility.
     */
    private static void apply(Product product, ProductRequest req, String sku, User editor) {
        ProductStatus requested = req.status() == null ? ProductStatus.ACTIVE : req.status();
        if (requested != ProductStatus.ACTIVE && requested != ProductStatus.INACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_STATUS",
                    "Trạng thái chỉ được là ACTIVE (hiển thị) hoặc INACTIVE (ẩn)");
        }
        product.setSku(sku);
        product.setName(req.name().trim());
        product.setDescription(blankToNull(req.description()));
        product.setPrice(req.price());
        product.setCategory(blankToNull(req.category()));
        product.replaceImages(req.imageUrls() == null ? List.of()
                : req.imageUrls().stream().map(String::trim).distinct().toList());
        product.setCondition(req.condition());
        product.setBrand(blankToNull(req.brand()));
        product.setAgeRange(req.ageRange());
        product.setSize(blankToNull(req.size()));
        product.setDefects(blankToNull(req.defects()));
        product.setUsageDuration(blankToNull(req.usageDuration()));
        product.setRejectReason(null);
        if (isAdmin(editor)) {
            product.setStatus(requested);
            product.markReviewed(editor.getId());
        } else {
            product.setStatus(requested == ProductStatus.ACTIVE ? ProductStatus.PENDING_REVIEW : ProductStatus.INACTIVE);
            product.markReviewed(null);
        }
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
