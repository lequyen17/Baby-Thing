package com.example.babything_api.modules.payments.service;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

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
import com.example.babything_api.modules.orders.entity.Order;
import com.example.babything_api.modules.orders.entity.OrderStatus;
import com.example.babything_api.modules.orders.repository.OrderRepository;
import com.example.babything_api.modules.payments.dto.CheckoutResponse;
import com.example.babything_api.modules.payments.dto.PaymentResponse;
import com.example.babything_api.modules.payments.dto.PaymentSummary;
import com.example.babything_api.modules.payments.entity.Payment;
import com.example.babything_api.modules.payments.entity.PaymentMethod;
import com.example.babything_api.modules.payments.entity.PaymentStatus;
import com.example.babything_api.modules.payments.gateway.MockPaymentGateway;
import com.example.babything_api.modules.payments.gateway.PaymentGateway;
import com.example.babything_api.modules.payments.repository.PaymentRepository;
import com.example.babything_api.modules.users.entity.Role;
import com.example.babything_api.modules.users.entity.User;

/**
 * Người mua thanh toán đơn qua cổng của đối tác (tài liệu BMC 5.4): tạo giao dịch → chuyển sang cổng →
 * cổng báo kết quả (handleResult) → đơn chuyển sang PENDING chờ người bán xác nhận.
 * Huỷ đơn đã thanh toán thì OrderService gọi refundForOrder. "Thanh toán của tôi" chỉ gồm giao dịch mình trả;
 * admin xem toàn sàn qua listAll / summaryAll.
 * Khoá theo thứ tự đơn → giao dịch ở mọi chỗ để thanh toán và huỷ đơn cùng lúc không khoá chéo nhau.
 */
@Service
public class PaymentService {

    public static final int MAX_PAGE_SIZE = 50;

    private static final Map<String, Sort> SORTS = Map.of(
            "newest", Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")),
            "oldest", Sort.by(Sort.Order.asc("createdAt"), Sort.Order.asc("id")),
            "amount_desc", Sort.by(Sort.Order.desc("amount"), Sort.Order.desc("id")),
            "amount_asc", Sort.by(Sort.Order.asc("amount"), Sort.Order.desc("id")));

    private static final String REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter REF_DAY = DateTimeFormatter.ofPattern("yyMMdd");

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final PaymentGateway gateway;
    private final AppProperties.Marketplace marketplace;

    public PaymentService(PaymentRepository paymentRepository, OrderRepository orderRepository,
            PaymentGateway gateway, AppProperties props) {
        this.paymentRepository = paymentRepository;
        this.orderRepository = orderRepository;
        this.gateway = gateway;
        this.marketplace = props.marketplace();
    }

    public record ListQuery(String q, PaymentStatus status, PaymentMethod method, String sort, int page, int size) {
    }

    // ---------------------------------------------------------------- Xem danh sách / chi tiết

    @Transactional(readOnly = true)
    public PageResponse<PaymentResponse> listMine(User viewer, ListQuery query) {
        return list(viewer, false, query);
    }

    @Transactional(readOnly = true)
    public PageResponse<PaymentResponse> listAll(User admin, ListQuery query) {
        requireAdmin(admin);
        return list(admin, true, query);
    }

    @Transactional(readOnly = true)
    public PaymentSummary summary(User viewer) {
        return toSummary(paymentRepository.sumByStatus(viewer.getId()));
    }

    @Transactional(readOnly = true)
    public PaymentSummary summaryAll(User admin) {
        requireAdmin(admin);
        return toSummary(paymentRepository.sumAllByStatus());
    }

    /** Người trả tiền hoặc admin. Giao dịch của người khác trả 404 để không lộ là có tồn tại. */
    @Transactional(readOnly = true)
    public PaymentResponse get(User viewer, Long id) {
        Payment payment = paymentRepository.findDetail(id).orElseThrow(PaymentService::notFound);
        checkPayer(viewer, payment, true);
        return PaymentResponse.from(payment);
    }

    // ---------------------------------------------------------------- Thanh toán

    /**
     * Người mua tạo giao dịch cho đơn đang chờ thanh toán. Giao dịch cũ còn PENDING (người mua bỏ dở, đổi hình thức)
     * bị cho hết hạn, nên mỗi đơn chỉ có một giao dịch đang mở.
     */
    @Transactional
    public CheckoutResponse checkout(User buyer, Long orderId, PaymentMethod method) {
        Order order = orderRepository.findForUpdate(orderId).orElseThrow(PaymentService::orderNotFound);
        if (!order.getUser().getId().equals(buyer.getId())) {
            // Admin cũng không trả hộ: tiền phải đi từ tài khoản của người mua
            throw isAdmin(buyer)
                    ? new ApiException(HttpStatus.FORBIDDEN, "NOT_ORDER_BUYER", "Chỉ người mua mới thanh toán được đơn này")
                    : orderNotFound();
        }
        if (order.getStatus() != OrderStatus.AWAITING_PAYMENT) {
            throw new ApiException(HttpStatus.CONFLICT, "ORDER_NOT_AWAITING_PAYMENT",
                    order.getStatus() == OrderStatus.CANCELLED
                            ? "Đơn hàng đã bị huỷ"
                            : "Đơn hàng này đã được thanh toán");
        }
        Instant now = Instant.now();
        if (order.getPaymentDueAt() != null && !now.isBefore(order.getPaymentDueAt())) {
            throw new ApiException(HttpStatus.CONFLICT, "PAYMENT_WINDOW_CLOSED",
                    "Đơn hàng đã quá hạn thanh toán và sẽ được huỷ tự động");
        }
        closePending(order, PaymentStatus.EXPIRED, "Đã tạo giao dịch thanh toán mới");

        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setUser(order.getUser());
        payment.setAmount(order.getTotalAmount());
        payment.setMethod(method);
        payment.setProvider(gateway.name());
        payment.setTransactionRef(generateRef());
        Instant expiresAt = now.plus(marketplace.paymentTtl());
        payment.setExpiresAt(order.getPaymentDueAt() != null && order.getPaymentDueAt().isBefore(expiresAt)
                ? order.getPaymentDueAt()
                : expiresAt);
        payment = paymentRepository.saveAndFlush(payment);
        return new CheckoutResponse(PaymentResponse.from(payment), gateway.checkoutUrl(payment));
    }

    /** Trang cổng giả lập đọc giao dịch theo mã; chỉ người trả tiền. */
    @Transactional(readOnly = true)
    public PaymentResponse getByRef(User viewer, String ref) {
        Payment payment = paymentRepository.findByTransactionRef(ref).orElseThrow(PaymentService::notFound);
        checkPayer(viewer, payment, false);
        return PaymentResponse.from(payment);
    }

    /** Người mua bấm kết quả trên cổng giả lập; đi chung đường với callback của cổng thật. */
    @Transactional
    public PaymentResponse completeMock(User viewer, String ref, boolean success) {
        Payment payment = paymentRepository.findByTransactionRef(ref).orElseThrow(PaymentService::notFound);
        checkPayer(viewer, payment, false);
        if (!MockPaymentGateway.NAME.equals(payment.getProvider())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "NOT_MOCK_PAYMENT", "Giao dịch này không qua cổng giả lập");
        }
        return handleResult(ref, success, "MOCK-" + randomCode(10),
                success ? null : "Người mua huỷ thanh toán trên cổng");
    }

    /**
     * Ghi nhận kết quả cổng gửi về. Gọi lặp lại (cổng retry IPN) thì trả trạng thái hiện tại, không xử lý lần hai.
     * Thanh toán thành công nhưng đơn đã huỷ / đã có giao dịch khác thì báo thất bại (cổng thật: hoàn tiền ngay).
     */
    @Transactional
    public PaymentResponse handleResult(String ref, boolean success, String providerTxnId, String failureReason) {
        Payment found = paymentRepository.findByTransactionRef(ref).orElseThrow(PaymentService::notFound);
        Order order = orderRepository.findForUpdate(found.getOrder().getId()).orElseThrow(PaymentService::orderNotFound);
        Payment payment = paymentRepository.findForUpdate(found.getId()).orElseThrow(PaymentService::notFound);
        if (payment.getStatus() != PaymentStatus.PENDING) {
            return PaymentResponse.from(payment);
        }
        payment.setProviderTxnId(providerTxnId);
        if (payment.getExpiresAt() != null && Instant.now().isAfter(payment.getExpiresAt())) {
            payment.setStatus(PaymentStatus.EXPIRED);
            payment.setFailureReason("Giao dịch đã hết hạn");
        } else if (!success) {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason(failureReason == null ? "Thanh toán không thành công" : failureReason);
        } else if (order.getStatus() != OrderStatus.AWAITING_PAYMENT) {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason("Đơn hàng không còn chờ thanh toán");
        } else {
            payment.setStatus(PaymentStatus.PAID);
            payment.setPaidAt(Instant.now());
            order.setStatus(OrderStatus.PENDING);
            orderRepository.save(order);
        }
        return PaymentResponse.from(paymentRepository.saveAndFlush(payment));
    }

    // ---------------------------------------------------------------- Gọi từ OrderService (đã khoá đơn)

    /** Đơn bị huỷ hoặc đổi tổng tiền: đóng các giao dịch còn đang mở. */
    @Transactional
    public void closePending(Order order, PaymentStatus status, String reason) {
        for (Payment p : paymentRepository.findByOrderIdAndStatus(order.getId(), PaymentStatus.PENDING)) {
            p.setStatus(status);
            p.setFailureReason(reason);
            paymentRepository.save(p);
        }
    }

    /** Hoàn tiền giao dịch đã thanh toán của đơn bị huỷ. Không có giao dịch PAID thì thôi. */
    @Transactional
    public void refundForOrder(Order order) {
        for (Payment p : paymentRepository.findByOrderIdAndStatus(order.getId(), PaymentStatus.PAID)) {
            gateway.refund(p);
            p.setStatus(PaymentStatus.REFUNDED);
            p.setRefundedAt(Instant.now());
            paymentRepository.save(p);
        }
    }

    /** Job: giao dịch quá hạn mà cổng không báo kết quả. */
    @Transactional
    public int expireOverdue() {
        return paymentRepository.expireOverdue(Instant.now());
    }

    // ---------------------------------------------------------------- Helpers

    private PageResponse<PaymentResponse> list(User viewer, boolean all, ListQuery query) {
        Sort sort = SORTS.get(query.sort() == null ? "newest" : query.sort());
        if (sort == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SORT",
                    "Kiểu sắp xếp phải là một trong: " + String.join(", ", SORTS.keySet()));
        }
        int page = Math.max(query.page(), 0);
        int size = Math.max(1, Math.min(query.size(), MAX_PAGE_SIZE));
        return PageResponse.of(
                paymentRepository.findAll(filter(all ? null : viewer.getId(), query), PageRequest.of(page, size, sort)),
                PaymentResponse::from);
    }

    /** payerId null = toàn sàn (admin), khi đó tìm được cả theo email người mua. */
    private static Specification<Payment> filter(Long payerId, ListQuery query) {
        return (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (payerId != null) {
                predicates.add(cb.equal(root.get("user").get("id"), payerId));
            }
            if (query.status() != null) {
                predicates.add(cb.equal(root.get("status"), query.status()));
            }
            if (query.method() != null) {
                predicates.add(cb.equal(root.get("method"), query.method()));
            }
            String q = blankToNull(query.q());
            if (q != null) {
                // "#12" hoặc "12" = mã đơn; còn lại tìm theo mã giao dịch
                String term = q.startsWith("#") ? q.substring(1) : q;
                String pattern = "%" + escapeLike(term.toLowerCase(Locale.ROOT)) + "%";
                List<Predicate> any = new ArrayList<>();
                any.add(cb.like(cb.lower(root.get("transactionRef")), pattern, '\\'));
                if (payerId == null) {
                    any.add(cb.like(cb.lower(root.get("user").get("email")), pattern, '\\'));
                }
                if (term.matches("\\d{1,18}")) {
                    any.add(cb.equal(root.get("order").get("id"), Long.parseLong(term)));
                }
                predicates.add(cb.or(any.toArray(Predicate[]::new)));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private static PaymentSummary toSummary(List<PaymentRepository.StatusTotal> rows) {
        Map<PaymentStatus, PaymentRepository.StatusTotal> totals = new EnumMap<>(PaymentStatus.class);
        rows.forEach(t -> totals.put(t.getStatus(), t));
        return new PaymentSummary(
                amount(totals, PaymentStatus.PAID), count(totals, PaymentStatus.PAID),
                count(totals, PaymentStatus.PENDING),
                amount(totals, PaymentStatus.REFUNDED), count(totals, PaymentStatus.REFUNDED));
    }

    private static void checkPayer(User viewer, Payment payment, boolean allowAdmin) {
        if (!(allowAdmin && isAdmin(viewer)) && !payment.getUser().getId().equals(viewer.getId())) {
            throw notFound();
        }
    }

    /** BT + yyMMdd + 8 ký tự ngẫu nhiên; trùng thì unique index chặn. */
    private static String generateRef() {
        String day = LocalDate.now(VN_ZONE).format(REF_DAY);
        return "BT" + day + randomCode(8);
    }

    private static String randomCode(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(REF_ALPHABET.charAt(RANDOM.nextInt(REF_ALPHABET.length())));
        }
        return sb.toString();
    }

    private static BigDecimal amount(Map<PaymentStatus, PaymentRepository.StatusTotal> totals, PaymentStatus status) {
        var t = totals.get(status);
        return t == null ? BigDecimal.ZERO : t.getAmount();
    }

    private static long count(Map<PaymentStatus, PaymentRepository.StatusTotal> totals, PaymentStatus status) {
        var t = totals.get(status);
        return t == null ? 0 : t.getCount();
    }

    private static void requireAdmin(User user) {
        if (!isAdmin(user)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_ONLY", "Chỉ quản trị viên mới xem được mục này");
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
        return new ApiException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND", "Không tìm thấy giao dịch");
    }

    private static ApiException orderNotFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng");
    }
}
