package com.example.babything_api.modules.care.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;

import com.example.babything_api.config.AppProperties;
import com.example.babything_api.core.dto.PageResponse;
import com.example.babything_api.core.exceptions.ApiException;
import com.example.babything_api.modules.care.dto.CareDtos.BatchResponse;
import com.example.babything_api.modules.care.dto.CareDtos.CreateRequest;
import com.example.babything_api.modules.care.dto.CareDtos.ItemRequest;
import com.example.babything_api.modules.care.dto.CareDtos.ItemResponse;
import com.example.babything_api.modules.care.dto.CareDtos.ListItem;
import com.example.babything_api.modules.care.dto.CareDtos.ListRequest;
import com.example.babything_api.modules.care.dto.CareDtos.Money;
import com.example.babything_api.modules.care.dto.CareDtos.QuoteItem;
import com.example.babything_api.modules.care.dto.CareDtos.QuoteRequest;
import com.example.babything_api.modules.care.dto.CareDtos.Rules;
import com.example.babything_api.modules.care.dto.CareDtos.ScreenRequest;
import com.example.babything_api.modules.care.dto.CareDtos.Seller;
import com.example.babything_api.modules.care.dto.CareDtos.Stats;
import com.example.babything_api.modules.care.entity.CareBatch;
import com.example.babything_api.modules.care.entity.CareBatchStatus;
import com.example.babything_api.modules.care.entity.CareItem;
import com.example.babything_api.modules.care.entity.CareItemStatus;
import com.example.babything_api.modules.care.repository.CareBatchRepository;
import com.example.babything_api.modules.care.repository.CareItemRepository;
import com.example.babything_api.modules.notifications.service.NotificationService;
import com.example.babything_api.modules.products.entity.Product;
import com.example.babything_api.modules.products.entity.ProductStatus;
import com.example.babything_api.modules.products.repository.ProductRepository;
import com.example.babything_api.modules.users.entity.Role;
import com.example.babything_api.modules.users.entity.User;

/**
 * BabyThings Care – ký gửi / bán hộ (tài liệu BMC 7.4). Luồng của một lô:
 * người bán đăng ký (SUBMITTED) → admin sàng lọc, báo giá sơ bộ (PRE_QUOTED; kho đầy thì WAITLISTED) →
 * người bán đồng ý thoả thuận (AWAITING_DROPOFF) → admin nhận hàng (RECEIVED) → kiểm tra, chấm cấp, báo giá
 * chính thức (QUOTED) → người bán duyệt và trả phí vệ sinh (CLEANING; từ chối thì RETURNING) → làm sạch, QC,
 * đăng bán với nhãn Renewed (SELLING, 60 ngày) → bán hết thì CLOSED, hết hạn / người bán dừng thì RETURNING →
 * admin hoàn trả hàng chưa bán (CLOSED).
 * Món bán được đi qua luồng đơn hàng chung; khi đơn hoàn tất, người bán nhận giá bán − 10% hoa hồng như hàng tự đăng.
 */
@Service
public class CareService {

    public static final List<String> CATEGORIES = List.of("Quần áo", "Đồ vải");
    public static final int MAX_ITEMS = 5;
    public static final BigDecimal MIN_LOT_VALUE = new BigDecimal("250000");
    public static final BigDecimal MAX_COST_RATIO = new BigDecimal("0.30");
    public static final int CAPACITY = 30;
    public static final int MONTHLY_LIMIT = 20;
    public static final Duration CONSIGNMENT = Duration.ofDays(60);
    public static final Duration PRICE_DROP_AFTER = Duration.ofDays(45);
    public static final Duration EXTENSION = Duration.ofDays(30);
    public static final Duration REMINDER_BEFORE = Duration.ofDays(7);
    public static final int MAX_PAGE_SIZE = 50;

    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter CODE_DAY = DateTimeFormatter.ofPattern("yyMMdd");

    private final CareBatchRepository batchRepository;
    private final CareItemRepository itemRepository;
    private final ProductRepository productRepository;
    private final NotificationService notifications;
    private final BigDecimal commissionRate;

    public CareService(CareBatchRepository batchRepository, CareItemRepository itemRepository,
            ProductRepository productRepository, NotificationService notifications, AppProperties props) {
        this.batchRepository = batchRepository;
        this.itemRepository = itemRepository;
        this.productRepository = productRepository;
        this.notifications = notifications;
        this.commissionRate = props.marketplace().commissionRate();
    }

    public Rules rules() {
        return new Rules(CATEGORIES, MAX_ITEMS, MIN_LOT_VALUE, MAX_COST_RATIO, commissionRate,
                (int) CONSIGNMENT.toDays(), (int) PRICE_DROP_AFTER.toDays(), (int) EXTENSION.toDays(),
                (int) REMINDER_BEFORE.toDays());
    }

    // ---------------------------------------------------------------- Xem

    /** mine = lô của người đang xem; admin không truyền mine thì thấy toàn bộ, lọc theo status / q. */
    @Transactional(readOnly = true)
    public PageResponse<BatchResponse> list(User viewer, boolean all, CareBatchStatus status, String q, int page,
            int size) {
        if (all) {
            requireAdmin(viewer);
        }
        Specification<CareBatch> spec = (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (!all) {
                predicates.add(cb.equal(root.get("seller").get("id"), viewer.getId()));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            String term = blankToNull(q);
            if (term != null) {
                String pattern = "%" + escapeLike(term.toLowerCase(Locale.ROOT)) + "%";
                List<Predicate> any = new ArrayList<>();
                any.add(cb.like(cb.lower(root.get("code")), pattern, '\\'));
                if (all) {
                    any.add(cb.like(cb.lower(root.get("seller").get("email")), pattern, '\\'));
                    any.add(cb.like(cb.lower(root.get("seller").get("displayName")), pattern, '\\'));
                }
                predicates.add(cb.or(any.toArray(Predicate[]::new)));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        var result = batchRepository.findAll(spec, PageRequest.of(Math.max(page, 0),
                Math.max(1, Math.min(size, MAX_PAGE_SIZE)), Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.desc("id"))));
        Map<Long, Product> products = products(result.getContent().stream().flatMap(b -> b.getItems().stream()).toList());
        return PageResponse.of(result, b -> toResponse(viewer, b, products));
    }

    @Transactional(readOnly = true)
    public BatchResponse get(User viewer, Long id) {
        CareBatch batch = batchRepository.findDetail(id).orElseThrow(CareService::notFound);
        checkAccess(viewer, batch);
        return toResponse(viewer, batch);
    }

    @Transactional(readOnly = true)
    public Stats stats(User admin) {
        requireAdmin(admin);
        Map<CareBatchStatus, Long> byStatus = new EnumMap<>(CareBatchStatus.class);
        for (CareBatchStatus s : CareBatchStatus.values()) {
            byStatus.put(s, 0L);
        }
        for (Object[] row : batchRepository.countByStatus()) {
            byStatus.put((CareBatchStatus) row[0], (Long) row[1]);
        }
        return new Stats(byStatus, batchRepository.countByStatusIn(CareBatchStatus.STORED), CAPACITY,
                batchRepository.countByPreQuotedAtGreaterThanEqual(monthStart()), MONTHLY_LIMIT,
                batchRepository.sumFeesCollected());
    }

    // ---------------------------------------------------------------- Người bán

    /** Bước 1: đăng ký gửi hàng. Hệ thống kiểm tra danh mục được nhận và giá trị lô tối thiểu. */
    @Transactional
    public BatchResponse create(User seller, CreateRequest req) {
        if (isAdmin(seller)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_CANNOT_CONSIGN", "Quản trị viên không ký gửi hàng");
        }
        BigDecimal total = BigDecimal.ZERO;
        for (ItemRequest i : req.items()) {
            if (!CATEGORIES.contains(i.category().trim())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "CATEGORY_NOT_ACCEPTED",
                        "Care giai đoạn đầu chỉ nhận " + String.join(", ", CATEGORIES).toLowerCase(Locale.ROOT)
                                + " giặt được bằng máy. \"" + i.name().trim() + "\" vui lòng tự đăng bán");
            }
            total = total.add(i.desiredPrice());
        }
        if (total.compareTo(MIN_LOT_VALUE) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "LOT_TOO_SMALL",
                    "Tổng giá mong muốn của lô cần từ " + money(MIN_LOT_VALUE) + " (hiện " + money(total) + ")");
        }
        CareBatch batch = new CareBatch();
        batch.setCode(generateCode());
        batch.setSeller(seller);
        batch.setDropoffMethod(req.dropoffMethod());
        batch.setSellerNote(blankToNull(req.note()));
        for (ItemRequest i : req.items()) {
            CareItem item = new CareItem();
            item.setName(i.name().trim());
            item.setCategory(i.category().trim());
            item.setSize(blankToNull(i.size()));
            item.setAgeRange(i.ageRange());
            item.setBrand(blankToNull(i.brand()));
            item.setDesiredPrice(i.desiredPrice());
            item.setSellerDescription(blankToNull(i.description()));
            item.setPhotoUrl(blankToNull(i.photoUrl()));
            batch.addItem(item);
        }
        return toResponse(seller, batchRepository.saveAndFlush(batch));
    }

    /** Bước 3: người bán đồng ý thoả thuận ký gửi điện tử theo báo giá sơ bộ, sau đó gửi hàng. */
    @Transactional
    public BatchResponse agree(User seller, Long id) {
        CareBatch batch = findOwnForUpdate(seller, id);
        expect(batch, CareBatchStatus.PRE_QUOTED, "Lô không ở bước chờ đồng ý báo giá sơ bộ");
        batch.setAgreedAt(Instant.now());
        batch.setStatus(CareBatchStatus.AWAITING_DROPOFF);
        return save(seller, batch);
    }

    /** Huỷ khi hàng chưa đến kho. */
    @Transactional
    public BatchResponse cancel(User seller, Long id) {
        CareBatch batch = findOwnForUpdate(seller, id);
        if (!batch.getStatus().isCancellableBySeller()) {
            throw new ApiException(HttpStatus.CONFLICT, "CARE_NOT_CANCELLABLE",
                    "Hàng đã đến kho, không huỷ được nữa. Bạn có thể từ chối báo giá để nhận lại hàng");
        }
        batch.setStatus(CareBatchStatus.CANCELLED);
        batch.setClosedAt(Instant.now());
        return save(seller, batch);
    }

    /**
     * Bước 7–8: người bán duyệt báo giá chính thức và thanh toán phí vệ sinh qua cổng (giả lập).
     * Chưa thanh toán thì chưa làm sạch.
     */
    @Transactional
    public BatchResponse acceptQuote(User seller, Long id) {
        CareBatch batch = findOwnForUpdate(seller, id);
        expect(batch, CareBatchStatus.QUOTED, "Lô không ở bước chờ duyệt báo giá");
        batch.setFeePaymentRef("BTC" + LocalDate.now(VN_ZONE).format(CODE_DAY) + randomCode(8));
        batch.setFeePaidAt(Instant.now());
        batch.setStatus(CareBatchStatus.CLEANING);
        return save(seller, batch);
    }

    /** Bước 7: từ chối báo giá chính thức → hoàn hàng, người bán chịu phí trả, không thu phí vệ sinh. */
    @Transactional
    public BatchResponse rejectQuote(User seller, Long id, String reason) {
        CareBatch batch = findOwnForUpdate(seller, id);
        expect(batch, CareBatchStatus.QUOTED, "Lô không ở bước chờ duyệt báo giá");
        startReturn(batch, blankToNull(reason) == null ? "Người bán từ chối báo giá" : "Từ chối báo giá: " + reason.trim());
        return save(seller, batch);
    }

    /** Bước 14: gia hạn một lần thêm 30 ngày, trong 7 ngày cuối của thời hạn ký gửi. */
    @Transactional
    public BatchResponse extend(User seller, Long id) {
        CareBatch batch = findOwnForUpdate(seller, id);
        expect(batch, CareBatchStatus.SELLING, "Chỉ gia hạn được lô đang bán");
        if (!canExtend(batch)) {
            throw new ApiException(HttpStatus.CONFLICT, "CANNOT_EXTEND", batch.getExtendedAt() != null
                    ? "Lô đã được gia hạn một lần"
                    : "Chỉ gia hạn được trong " + REMINDER_BEFORE.toDays() + " ngày cuối của thời hạn ký gửi");
        }
        batch.setExpiresAt(batch.getExpiresAt().plus(EXTENSION));
        batch.setExtendedAt(Instant.now());
        batch.setExpiryRemindedAt(null);
        return save(seller, batch);
    }

    /** Bước 14–15: người bán dừng ký gửi, nhận lại các món chưa bán (người bán chịu phí trả). */
    @Transactional
    public BatchResponse end(User seller, Long id) {
        CareBatch batch = findOwnForUpdate(seller, id);
        expect(batch, CareBatchStatus.SELLING, "Chỉ dừng được lô đang bán");
        startReturn(batch, "Người bán dừng ký gửi, nhận lại hàng");
        return save(seller, batch);
    }

    // ---------------------------------------------------------------- Admin

    /**
     * Bước 2–3: sàng lọc online. Nhận thì gửi báo giá sơ bộ (khoảng giá cả lô + phí vệ sinh dự kiến), kiểm tra
     * quy tắc hoa hồng + phí ≤ 30% giá bán. Kho đã đủ lô hoặc hết chỉ tiêu tháng thì đưa vào danh sách chờ.
     */
    @Transactional
    public BatchResponse screen(User admin, Long id, ScreenRequest req) {
        requireAdmin(admin);
        CareBatch batch = findForUpdate(id);
        expect(batch, Set.of(CareBatchStatus.SUBMITTED, CareBatchStatus.WAITLISTED), "Lô không ở bước sàng lọc");
        if (!req.accept()) {
            String reason = blankToNull(req.reason());
            if (reason == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "REASON_REQUIRED", "Vui lòng ghi lý do không tiếp nhận");
            }
            batch.setStatus(CareBatchStatus.DECLINED);
            batch.setDeclineReason(reason);
            batch.setClosedAt(Instant.now());
            notifySeller(batch, "Lô " + batch.getCode() + " không được tiếp nhận", "Lý do: " + reason);
            return save(admin, batch);
        }
        BigDecimal min = req.expectedMin();
        BigDecimal max = req.expectedMax();
        BigDecimal fee = req.estimatedFee();
        if (min == null || max == null || fee == null || fee.signum() < 0 || max.compareTo(min) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PRE_QUOTE",
                    "Nhập khoảng giá niêm yết (từ ≤ đến) và phí vệ sinh dự kiến");
        }
        if (min.compareTo(MIN_LOT_VALUE) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "LOT_TOO_SMALL",
                    "Giá bán dự kiến của lô cần từ " + money(MIN_LOT_VALUE));
        }
        checkCostRatio(min, fee);
        long stored = batchRepository.countByStatusIn(CareBatchStatus.STORED);
        long month = batchRepository.countByPreQuotedAtGreaterThanEqual(monthStart());
        if (stored >= CAPACITY || month >= MONTHLY_LIMIT) {
            if (batch.getStatus() != CareBatchStatus.WAITLISTED) {
                batch.setStatus(CareBatchStatus.WAITLISTED);
                notifySeller(batch, "Lô " + batch.getCode() + " đang trong danh sách chờ",
                        "Kho Care tạm đầy. Baby Things sẽ báo giá ngay khi có chỗ.");
            }
            return save(admin, batch);
        }
        batch.setExpectedMin(min);
        batch.setExpectedMax(max);
        batch.setEstimatedFee(fee);
        batch.setPreQuotedAt(Instant.now());
        batch.setStatus(CareBatchStatus.PRE_QUOTED);
        notifySeller(batch, "Lô " + batch.getCode() + " có báo giá sơ bộ",
                "Giá niêm yết dự kiến " + money(min) + " – " + money(max) + ", phí vệ sinh dự kiến " + money(fee)
                        + ". Đồng ý thoả thuận để gửi hàng.");
        return save(admin, batch);
    }

    /** Bước 5: mở hàng, chụp tình trạng lúc nhận, đối chiếu khai báo. */
    @Transactional
    public BatchResponse receive(User admin, Long id, String intakeNote) {
        requireAdmin(admin);
        CareBatch batch = findForUpdate(id);
        expect(batch, CareBatchStatus.AWAITING_DROPOFF, "Lô không ở bước chờ gửi hàng");
        batch.setReceivedAt(Instant.now());
        batch.setIntakeNote(blankToNull(intakeNote));
        batch.setStatus(CareBatchStatus.RECEIVED);
        notifySeller(batch, "Baby Things đã nhận lô " + batch.getCode(),
                "Hàng đang được kiểm tra, bạn sẽ nhận báo giá chính thức sớm.");
        return save(admin, batch);
    }

    /**
     * Bước 6–7: chấm cấp từng món, loại món không đạt, gửi giá niêm yết, giá sàn (phạm vi điều chỉnh) và phí vệ
     * sinh cuối cùng. Báo giá lại được khi người bán chưa duyệt.
     */
    @Transactional
    public BatchResponse quote(User admin, Long id, QuoteRequest req) {
        requireAdmin(admin);
        CareBatch batch = findForUpdate(id);
        expect(batch, Set.of(CareBatchStatus.RECEIVED, CareBatchStatus.QUOTED), "Lô chưa được nhận vào kho");
        Map<Long, QuoteItem> byId = req.items().stream()
                .collect(Collectors.toMap(QuoteItem::id, Function.identity(), (a, b) -> b));
        BigDecimal listTotal = BigDecimal.ZERO;
        int accepted = 0;
        for (CareItem item : batch.getItems()) {
            QuoteItem q = byId.get(item.getId());
            if (q == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "QUOTE_INCOMPLETE",
                        "Thiếu kết quả kiểm tra cho món \"" + item.getName() + "\"");
            }
            if (!q.accepted()) {
                String reason = blankToNull(q.rejectReason());
                if (reason == null) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "REASON_REQUIRED",
                            "Ghi lý do không đạt cho món \"" + item.getName() + "\"");
                }
                item.setStatus(CareItemStatus.REJECTED);
                item.setRejectReason(reason);
                item.setGrade(null);
                item.setListPrice(null);
                item.setFloorPrice(null);
                continue;
            }
            if (q.grade() == null || q.listPrice() == null || q.floorPrice() == null || q.floorPrice().signum() <= 0
                    || q.floorPrice().compareTo(q.listPrice()) > 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ITEM_QUOTE",
                        "Món \"" + item.getName() + "\" cần cấp tình trạng, giá niêm yết và giá sàn (≤ giá niêm yết)");
            }
            item.setStatus(CareItemStatus.ACCEPTED);
            item.setRejectReason(null);
            item.setGrade(q.grade());
            item.setDefects(blankToNull(q.defects()));
            item.setListPrice(q.listPrice());
            item.setFloorPrice(q.floorPrice());
            listTotal = listTotal.add(q.listPrice());
            accepted++;
        }
        if (accepted == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "NO_ACCEPTED_ITEM",
                    "Không món nào đạt: dùng \"Hoàn trả cả lô\" thay vì báo giá");
        }
        if (listTotal.compareTo(MIN_LOT_VALUE) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "LOT_TOO_SMALL",
                    "Tổng giá niêm yết các món đạt cần từ " + money(MIN_LOT_VALUE) + " (hiện " + money(listTotal) + ")");
        }
        checkCostRatio(listTotal, req.cleaningFee());
        batch.setCleaningFee(req.cleaningFee());
        batch.setQuotedAt(Instant.now());
        batch.setStatus(CareBatchStatus.QUOTED);
        notifySeller(batch, "Báo giá chính thức lô " + batch.getCode(),
                accepted + "/" + batch.getItems().size() + " món đạt, tổng giá niêm yết " + money(listTotal)
                        + ", phí vệ sinh " + money(req.cleaningFee()) + ". Duyệt và thanh toán phí để bắt đầu làm sạch.");
        return save(admin, batch);
    }

    /**
     * Bước 9–11: đã làm sạch theo SOP, QC đạt, chụp ảnh chuẩn → đăng từng món lên marketplace chung với nhãn
     * Renewed. Tin đăng thuộc người bán (hàng vẫn của họ) nhưng chỉ Baby Things quản lý. Ngày 0 tính từ lúc đăng.
     */
    @Transactional
    public BatchResponse publish(User admin, Long id, ListRequest req) {
        requireAdmin(admin);
        CareBatch batch = findForUpdate(id);
        expect(batch, CareBatchStatus.CLEANING, "Lô chưa thanh toán phí hoặc đã đăng bán");
        Map<Long, ListItem> byId = req.items().stream()
                .collect(Collectors.toMap(ListItem::id, Function.identity(), (a, b) -> b));
        Instant now = Instant.now();
        for (CareItem item : batch.getItems()) {
            if (item.getStatus() != CareItemStatus.ACCEPTED) {
                continue;
            }
            ListItem li = byId.get(item.getId());
            if (li == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "PHOTOS_REQUIRED",
                        "Thiếu ảnh chụp sau làm sạch của món \"" + item.getName() + "\"");
            }
            Product product = new Product();
            product.setSku(batch.getCode() + "-" + item.getPosition());
            product.setName(item.getName());
            String description = blankToNull(li.description());
            product.setDescription(description != null ? description : item.getSellerDescription());
            product.setPrice(item.getListPrice());
            product.setStock(1);
            product.setCategory(item.getCategory());
            product.replaceImages(li.imageUrls().stream().map(String::trim).distinct().toList());
            product.setCondition(item.getGrade().condition());
            product.setBrand(item.getBrand());
            product.setAgeRange(item.getAgeRange());
            product.setSize(item.getSize());
            product.setDefects(item.getDefects() == null ? "Không có" : item.getDefects());
            product.setStatus(ProductStatus.ACTIVE);
            product.markReviewed(admin.getId());
            product.setCreatedBy(batch.getSeller().getId());
            product.setSeller(batch.getSeller());
            product.setUpdatedBy(admin.getId());
            product.setCareItem(item);
            product = productRepository.saveAndFlush(product);
            item.setProductId(product.getId());
            item.setStatus(CareItemStatus.LISTED);
        }
        batch.setCleanedAt(now);
        batch.setListedAt(now);
        batch.setExpiresAt(now.plus(CONSIGNMENT));
        batch.setStatus(CareBatchStatus.SELLING);
        notifySeller(batch, "Lô " + batch.getCode() + " đã lên sàn",
                "Các món đạt QC đang được bán với nhãn BabyThings Renewed trong " + CONSIGNMENT.toDays() + " ngày.");
        return save(admin, batch);
    }

    /** Hoàn trả cả lô khi kiểm tra không món nào đạt (bước 6). */
    @Transactional
    public BatchResponse returnAll(User admin, Long id, String reason) {
        requireAdmin(admin);
        CareBatch batch = findForUpdate(id);
        expect(batch, Set.of(CareBatchStatus.RECEIVED, CareBatchStatus.QUOTED), "Chỉ hoàn trả được lô đang kiểm tra");
        String why = blankToNull(reason);
        if (why == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "REASON_REQUIRED", "Vui lòng ghi lý do hoàn trả");
        }
        startReturn(batch, why);
        return save(admin, batch);
    }

    /**
     * Bước 15: đã trả hàng chưa bán (và các món không đạt) cho người bán → kết thúc lô. Món đang có đơn chưa xong
     * thì chờ đơn hoàn tất / bị huỷ.
     */
    @Transactional
    public BatchResponse markReturned(User admin, Long id) {
        requireAdmin(admin);
        CareBatch batch = findForUpdate(id);
        expect(batch, CareBatchStatus.RETURNING, "Lô không ở bước chờ hoàn trả");
        Map<Long, Product> products = products(batch.getItems());
        for (CareItem item : batch.getItems()) {
            Product p = item.getProductId() == null ? null : products.get(item.getProductId());
            if (item.getStatus() == CareItemStatus.LISTED && p != null && p.getStock() <= 0) {
                throw new ApiException(HttpStatus.CONFLICT, "ITEM_IN_ORDER",
                        "Món \"" + item.getName() + "\" đang có đơn hàng chưa xong. Chờ đơn hoàn tất hoặc bị huỷ");
            }
        }
        Instant now = Instant.now();
        for (CareItem item : batch.getItems()) {
            if (item.getStatus() != CareItemStatus.SOLD) {
                item.setStatus(CareItemStatus.RETURNED);
            }
        }
        batch.setReturnedAt(now);
        batch.setClosedAt(now);
        batch.setStatus(CareBatchStatus.CLOSED);
        notifySeller(batch, "Lô " + batch.getCode() + " đã kết thúc", "Baby Things đã hoàn trả các món chưa bán.");
        return save(admin, batch);
    }

    // ---------------------------------------------------------------- Gọi từ OrderService / job

    /** Đơn Care hoàn tất: món chuyển SOLD; lô bán hết thì kết thúc (hoặc chờ trả các món không đạt). */
    @Transactional
    public void onOrderCompleted(Collection<Long> productIds) {
        if (productIds.isEmpty()) {
            return;
        }
        Set<Long> batchIds = new HashSet<>();
        Instant now = Instant.now();
        for (CareItem item : itemRepository.findByProductIdIn(productIds)) {
            if (item.getStatus() == CareItemStatus.LISTED) {
                item.setStatus(CareItemStatus.SOLD);
                item.setSoldAt(now);
                itemRepository.save(item);
                batchIds.add(item.getBatch().getId());
                notifySeller(item.getBatch(), "Đã bán \"" + item.getName() + "\"",
                        "Món trong lô " + item.getBatch().getCode()
                                + " đã bán thành công. Tiền (đã trừ hoa hồng) được ghi nhận vào Doanh thu.");
            }
        }
        for (Long batchId : batchIds) {
            CareBatch batch = findForUpdate(batchId);
            boolean unsold = batch.getItems().stream().anyMatch(i -> i.getStatus() == CareItemStatus.LISTED);
            if (batch.getStatus() != CareBatchStatus.SELLING || unsold) {
                continue;
            }
            boolean rejected = batch.getItems().stream().anyMatch(i -> i.getStatus() == CareItemStatus.REJECTED);
            if (rejected) {
                startReturn(batch, "Đã bán hết, trả các món không đạt");
            } else {
                batch.setClosedAt(now);
                batch.setStatus(CareBatchStatus.CLOSED);
                notifySeller(batch, "Lô " + batch.getCode() + " đã bán hết", "Cảm ơn bạn đã dùng BabyThings Care!");
            }
            batchRepository.save(batch);
        }
    }

    /** Ngày 45 chưa bán: giảm về giá sàn người bán đã duyệt và báo cho người bán. */
    @Transactional
    public boolean dropPrices(Long id) {
        CareBatch batch = findForUpdate(id);
        if (batch.getStatus() != CareBatchStatus.SELLING || batch.getPriceDroppedAt() != null) {
            return false;
        }
        int dropped = 0;
        for (CareItem item : batch.getItems()) {
            if (item.getStatus() != CareItemStatus.LISTED || item.getProductId() == null) {
                continue;
            }
            Product p = productRepository.findAliveForUpdate(item.getProductId()).orElse(null);
            if (p != null && p.getStock() > 0 && p.getPrice().compareTo(item.getFloorPrice()) > 0) {
                p.setPrice(item.getFloorPrice());
                productRepository.save(p);
                dropped++;
            }
        }
        batch.setPriceDroppedAt(Instant.now());
        batchRepository.save(batch);
        if (dropped > 0) {
            notifySeller(batch, "Đã giảm giá " + dropped + " món trong lô " + batch.getCode(),
                    "Sau " + PRICE_DROP_AFTER.toDays() + " ngày chưa bán, giá được giảm về mức sàn bạn đã duyệt.");
        }
        return true;
    }

    @Transactional
    public boolean remindExpiry(Long id) {
        CareBatch batch = findForUpdate(id);
        if (batch.getStatus() != CareBatchStatus.SELLING || batch.getExpiryRemindedAt() != null) {
            return false;
        }
        batch.setExpiryRemindedAt(Instant.now());
        batchRepository.save(batch);
        notifySeller(batch, "Lô " + batch.getCode() + " sắp hết hạn ký gửi",
                batch.getExtendedAt() == null
                        ? "Gia hạn thêm " + EXTENSION.toDays() + " ngày hoặc chọn nhận lại hàng trước khi hết hạn."
                        : "Lô đã gia hạn một lần; khi hết hạn, các món chưa bán sẽ được hoàn trả.");
        return true;
    }

    /** Hết thời hạn ký gửi mà người bán không gia hạn: gỡ tin, chuyển sang chờ hoàn trả. */
    @Transactional
    public boolean expire(Long id) {
        CareBatch batch = findForUpdate(id);
        if (batch.getStatus() != CareBatchStatus.SELLING || batch.getExpiresAt().isAfter(Instant.now())) {
            return false;
        }
        startReturn(batch, "Hết thời hạn ký gửi");
        batchRepository.save(batch);
        return true;
    }

    @Transactional(readOnly = true)
    public List<Long> findForPriceDrop() {
        return batchRepository.findIdsForPriceDrop(Instant.now().minus(PRICE_DROP_AFTER));
    }

    @Transactional(readOnly = true)
    public List<Long> findForReminder() {
        return batchRepository.findIdsForReminder(Instant.now().plus(REMINDER_BEFORE));
    }

    @Transactional(readOnly = true)
    public List<Long> findExpired() {
        return batchRepository.findIdsExpired(Instant.now());
    }

    // ---------------------------------------------------------------- Helpers

    /** Gỡ các tin chưa bán khỏi sàn và chờ admin trả hàng. Đơn đã đặt trước đó vẫn đi tiếp. */
    private void startReturn(CareBatch batch, String reason) {
        for (CareItem item : batch.getItems()) {
            if (item.getStatus() == CareItemStatus.LISTED && item.getProductId() != null) {
                productRepository.findAliveForUpdate(item.getProductId()).ifPresent(p -> {
                    p.setStatus(ProductStatus.INACTIVE);
                    productRepository.save(p);
                });
            }
        }
        batch.setReturnReason(reason);
        batch.setStatus(CareBatchStatus.RETURNING);
        notifySeller(batch, "Lô " + batch.getCode() + " chờ hoàn trả",
                reason + ". Baby Things sẽ gửi trả các món chưa bán (người bán chịu phí trả).");
    }

    /** Hoa hồng 10% + phí vệ sinh không vượt 30% giá bán. */
    private void checkCostRatio(BigDecimal price, BigDecimal fee) {
        BigDecimal cost = price.multiply(commissionRate).add(fee);
        if (cost.compareTo(price.multiply(MAX_COST_RATIO)) > 0) {
            BigDecimal maxFee = price.multiply(MAX_COST_RATIO.subtract(commissionRate)).setScale(0, RoundingMode.DOWN);
            throw new ApiException(HttpStatus.BAD_REQUEST, "COST_RATIO_EXCEEDED",
                    "Hoa hồng + phí vệ sinh vượt " + MAX_COST_RATIO.movePointRight(2).stripTrailingZeros().toPlainString()
                            + "% giá bán. Phí vệ sinh tối đa " + money(maxFee));
        }
    }

    private static boolean canExtend(CareBatch batch) {
        return batch.getStatus() == CareBatchStatus.SELLING && batch.getExtendedAt() == null
                && batch.getExpiresAt() != null && !Instant.now().isBefore(batch.getExpiresAt().minus(REMINDER_BEFORE));
    }

    private BatchResponse toResponse(User viewer, CareBatch batch) {
        return toResponse(viewer, batch, products(batch.getItems()));
    }

    private BatchResponse toResponse(User viewer, CareBatch b, Map<Long, Product> products) {
        List<ItemResponse> items = new ArrayList<>();
        BigDecimal listTotal = BigDecimal.ZERO;
        BigDecimal floorTotal = BigDecimal.ZERO;
        BigDecimal soldTotal = BigDecimal.ZERO;
        int sold = 0;
        for (CareItem i : b.getItems()) {
            Product p = i.getProductId() == null ? null : products.get(i.getProductId());
            items.add(new ItemResponse(i.getId(), i.getPosition(), i.getName(), i.getCategory(), i.getSize(),
                    i.getAgeRange(), i.getBrand(), i.getDesiredPrice(), i.getSellerDescription(), i.getPhotoUrl(),
                    i.getStatus(), i.getGrade(), i.getGrade() == null ? null : i.getGrade().label(), i.getDefects(),
                    i.getRejectReason(), i.getListPrice(), i.getFloorPrice(), i.getProductId(),
                    p == null ? null : p.getPrice(), p == null ? null : p.getStock(), i.getSoldAt()));
            if (i.getListPrice() != null) {
                listTotal = listTotal.add(i.getListPrice());
                floorTotal = floorTotal.add(i.getFloorPrice());
            }
            if (i.getStatus() == CareItemStatus.SOLD) {
                sold++;
                soldTotal = soldTotal.add(p != null ? p.getPrice() : i.getListPrice());
            }
        }
        BigDecimal fee = b.getCleaningFee() == null ? BigDecimal.ZERO : b.getCleaningFee();
        BigDecimal commission = listTotal.multiply(commissionRate).setScale(0, RoundingMode.HALF_UP);
        BigDecimal ratio = listTotal.signum() == 0 ? BigDecimal.ZERO
                : commission.add(fee).divide(listTotal, 4, RoundingMode.HALF_UP);
        BigDecimal payout = soldTotal.subtract(soldTotal.multiply(commissionRate).setScale(0, RoundingMode.HALF_UP));
        Money money = new Money(listTotal, floorTotal, commission, fee, listTotal.subtract(commission).subtract(fee),
                ratio, soldTotal, payout);
        var s = b.getSeller();
        return new BatchResponse(b.getId(), b.getCode(), b.getStatus(), b.getStatus().label(),
                new Seller(s.getId(), s.getDisplayName(), isAdmin(viewer) ? s.getEmail() : null), b.getDropoffMethod(),
                b.getSellerNote(), b.getDeclineReason(), b.getExpectedMin(), b.getExpectedMax(), b.getEstimatedFee(),
                b.getIntakeNote(), b.getCleaningFee(), b.getFeePaymentRef(), money, b.getItems().size(), sold,
                canExtend(b), b.getPreQuotedAt(), b.getAgreedAt(), b.getReceivedAt(), b.getQuotedAt(), b.getFeePaidAt(),
                b.getCleanedAt(), b.getListedAt(), b.getListedAt() == null ? null : b.getListedAt().plus(PRICE_DROP_AFTER),
                b.getPriceDroppedAt(), b.getExpiresAt(), b.getExtendedAt(), b.getReturnReason(), b.getReturnedAt(),
                b.getClosedAt(), b.getCreatedAt(), b.getUpdatedAt(), items);
    }

    private Map<Long, Product> products(List<CareItem> items) {
        List<Long> ids = items.stream().map(CareItem::getProductId).filter(java.util.Objects::nonNull).toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<Long, Product> map = new HashMap<>();
        productRepository.findAllById(ids).forEach(p -> map.put(p.getId(), p));
        return map;
    }

    private BatchResponse save(User viewer, CareBatch batch) {
        return toResponse(viewer, batchRepository.saveAndFlush(batch));
    }

    private void notifySeller(CareBatch batch, String title, String body) {
        notifications.notify(batch.getSeller().getId(), NotificationService.LISTING, title, body,
                "/care/" + batch.getId());
    }

    private CareBatch findForUpdate(Long id) {
        return batchRepository.findForUpdate(id).orElseThrow(CareService::notFound);
    }

    /** Lô của người khác trả 404 để không lộ là có tồn tại. */
    private CareBatch findOwnForUpdate(User seller, Long id) {
        CareBatch batch = findForUpdate(id);
        if (!batch.getSeller().getId().equals(seller.getId())) {
            throw notFound();
        }
        return batch;
    }

    private static void checkAccess(User viewer, CareBatch batch) {
        if (!isAdmin(viewer) && !batch.getSeller().getId().equals(viewer.getId())) {
            throw notFound();
        }
    }

    private static void expect(CareBatch batch, CareBatchStatus status, String message) {
        expect(batch, Set.of(status), message);
    }

    private static void expect(CareBatch batch, Set<CareBatchStatus> statuses, String message) {
        if (!statuses.contains(batch.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_CARE_STEP",
                    message + " (hiện: " + batch.getStatus().label() + ")");
        }
    }

    private static Instant monthStart() {
        return LocalDate.now(VN_ZONE).withDayOfMonth(1).atStartOfDay(VN_ZONE).toInstant();
    }

    /** CR + yyMMdd + - + 4 ký tự ngẫu nhiên; trùng thì unique index chặn. */
    private static String generateCode() {
        return "CR" + LocalDate.now(VN_ZONE).format(CODE_DAY) + "-" + randomCode(4);
    }

    private static String randomCode(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
        }
        return sb.toString();
    }

    private static String money(BigDecimal amount) {
        return String.format(Locale.forLanguageTag("vi-VN"), "%,.0fđ", amount);
    }

    private static void requireAdmin(User user) {
        if (!isAdmin(user)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_ONLY", "Chỉ quản trị viên mới thực hiện được bước này");
        }
    }

    private static boolean isAdmin(User user) {
        return user.getRole() == Role.ADMIN;
    }

    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "CARE_BATCH_NOT_FOUND", "Không tìm thấy lô ký gửi");
    }
}
