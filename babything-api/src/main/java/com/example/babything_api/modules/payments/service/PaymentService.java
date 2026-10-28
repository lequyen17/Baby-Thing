package com.example.babything_api.modules.payments.service;

import java.math.BigDecimal;
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

import com.example.babything_api.core.dto.PageResponse;
import com.example.babything_api.core.exceptions.ApiException;
import com.example.babything_api.modules.payments.dto.PaymentResponse;
import com.example.babything_api.modules.payments.dto.PaymentSummary;
import com.example.babything_api.modules.payments.entity.Payment;
import com.example.babything_api.modules.payments.entity.PaymentMethod;
import com.example.babything_api.modules.payments.entity.PaymentStatus;
import com.example.babything_api.modules.payments.repository.PaymentRepository;
import com.example.babything_api.modules.users.entity.Role;
import com.example.babything_api.modules.users.entity.User;

/**
 * "Thanh toán của tôi": người mua chỉ xem giao dịch mình đã trả, kể cả admin (trang quản trị đối soát làm sau).
 * Tạo giao dịch / nhận kết quả từ cổng thanh toán sẽ thêm vào đây khi tích hợp cổng.
 */
@Service
public class PaymentService {

    public static final int MAX_PAGE_SIZE = 50;

    private static final Map<String, Sort> SORTS = Map.of(
            "newest", Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")),
            "oldest", Sort.by(Sort.Order.asc("createdAt"), Sort.Order.asc("id")),
            "amount_desc", Sort.by(Sort.Order.desc("amount"), Sort.Order.desc("id")),
            "amount_asc", Sort.by(Sort.Order.asc("amount"), Sort.Order.desc("id")));

    private final PaymentRepository paymentRepository;

    public PaymentService(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    public record ListQuery(String q, PaymentStatus status, PaymentMethod method, String sort, int page, int size) {
    }

    // ---------------------------------------------------------------- Xem danh sách / chi tiết

    @Transactional(readOnly = true)
    public PageResponse<PaymentResponse> listMine(User viewer, ListQuery query) {
        Sort sort = SORTS.get(query.sort() == null ? "newest" : query.sort());
        if (sort == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SORT",
                    "Kiểu sắp xếp phải là một trong: " + String.join(", ", SORTS.keySet()));
        }
        int page = Math.max(query.page(), 0);
        int size = Math.max(1, Math.min(query.size(), MAX_PAGE_SIZE));
        return PageResponse.of(
                paymentRepository.findAll(filter(viewer, query), PageRequest.of(page, size, sort)),
                PaymentResponse::from);
    }

    @Transactional(readOnly = true)
    public PaymentSummary summary(User viewer) {
        Map<PaymentStatus, PaymentRepository.StatusTotal> totals = new EnumMap<>(PaymentStatus.class);
        paymentRepository.sumByStatus(viewer.getId()).forEach(t -> totals.put(t.getStatus(), t));
        return new PaymentSummary(
                amount(totals, PaymentStatus.PAID), count(totals, PaymentStatus.PAID),
                count(totals, PaymentStatus.PENDING),
                amount(totals, PaymentStatus.REFUNDED), count(totals, PaymentStatus.REFUNDED));
    }

    /** Người trả tiền hoặc admin. Giao dịch của người khác trả 404 để không lộ là có tồn tại. */
    @Transactional(readOnly = true)
    public PaymentResponse get(User viewer, Long id) {
        Payment payment = paymentRepository.findDetail(id).orElseThrow(PaymentService::notFound);
        if (!isAdmin(viewer) && !payment.getUser().getId().equals(viewer.getId())) {
            throw notFound();
        }
        return PaymentResponse.from(payment);
    }

    // ---------------------------------------------------------------- Helpers

    private static Specification<Payment> filter(User viewer, ListQuery query) {
        return (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("user").get("id"), viewer.getId()));
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
                if (term.matches("\\d{1,18}")) {
                    any.add(cb.equal(root.get("order").get("id"), Long.parseLong(term)));
                }
                predicates.add(cb.or(any.toArray(Predicate[]::new)));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private static BigDecimal amount(Map<PaymentStatus, PaymentRepository.StatusTotal> totals, PaymentStatus status) {
        var t = totals.get(status);
        return t == null ? BigDecimal.ZERO : t.getAmount();
    }

    private static long count(Map<PaymentStatus, PaymentRepository.StatusTotal> totals, PaymentStatus status) {
        var t = totals.get(status);
        return t == null ? 0 : t.getCount();
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
}
