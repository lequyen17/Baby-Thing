package com.example.babything_api.modules.settlements.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
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
import com.example.babything_api.modules.settlements.dto.PayoutAccountDto;
import com.example.babything_api.modules.settlements.dto.SettlementResponse;
import com.example.babything_api.modules.settlements.dto.SettlementSummary;
import com.example.babything_api.modules.settlements.entity.PayoutAccount;
import com.example.babything_api.modules.settlements.entity.Settlement;
import com.example.babything_api.modules.settlements.entity.SettlementStatus;
import com.example.babything_api.modules.settlements.repository.PayoutAccountRepository;
import com.example.babything_api.modules.settlements.repository.SettlementRepository;
import com.example.babything_api.modules.users.entity.Role;
import com.example.babything_api.modules.users.entity.User;

/**
 * Quyết toán người bán (tài liệu BMC 7.3.4): đơn hoàn tất sinh một khoản = giá bán − hoa hồng, chờ admin chuyển
 * khoản theo kỳ rồi ghi nhận đã trả. Người bán xem khoản của mình; admin xem toàn sàn kèm tài khoản nhận tiền.
 */
@Service
public class SettlementService {

    public static final int MAX_PAGE_SIZE = 50;

    private static final Sort NEWEST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

    private final SettlementRepository settlementRepository;
    private final PayoutAccountRepository payoutAccountRepository;
    private final BigDecimal commissionRate;

    public SettlementService(SettlementRepository settlementRepository,
            PayoutAccountRepository payoutAccountRepository, AppProperties props) {
        this.settlementRepository = settlementRepository;
        this.payoutAccountRepository = payoutAccountRepository;
        this.commissionRate = props.marketplace().commissionRate();
    }

    public record ListQuery(String q, SettlementStatus status, Long sellerId, int page, int size) {
    }

    // ---------------------------------------------------------------- Gọi từ OrderService khi đơn hoàn tất

    /** Mỗi đơn chỉ một khoản; hoa hồng làm tròn đến đồng. */
    @Transactional
    public void createFor(Order order) {
        if (settlementRepository.existsByOrderId(order.getId())) {
            return;
        }
        BigDecimal commission = order.getTotalAmount().multiply(commissionRate).setScale(0, RoundingMode.HALF_UP);
        settlementRepository.save(Settlement.of(order, commissionRate, commission));
    }

    // ---------------------------------------------------------------- Người bán

    @Transactional(readOnly = true)
    public PageResponse<SettlementResponse> listMine(User seller, ListQuery query) {
        Page<Settlement> page = settlementRepository.findAll(filter(seller.getId(), query, false), pageable(query));
        return PageResponse.of(page, s -> SettlementResponse.from(s, null, false));
    }

    @Transactional(readOnly = true)
    public SettlementSummary summaryMine(User seller) {
        return toSummary(settlementRepository.sumBySeller(seller.getId()));
    }

    @Transactional(readOnly = true)
    public PayoutAccountDto getPayoutAccount(User user) {
        return PayoutAccountDto.from(payoutAccountRepository.findById(user.getId()).orElse(null));
    }

    @Transactional
    public PayoutAccountDto savePayoutAccount(User user, PayoutAccountDto req) {
        PayoutAccount account = payoutAccountRepository.findById(user.getId()).orElseGet(() -> {
            PayoutAccount created = new PayoutAccount();
            created.setUserId(user.getId());
            return created;
        });
        account.setBankCode(req.bankCode().trim());
        account.setAccountNo(req.accountNo().trim());
        account.setHolderName(req.holderName().trim().toUpperCase(Locale.ROOT));
        return PayoutAccountDto.from(payoutAccountRepository.saveAndFlush(account));
    }

    // ---------------------------------------------------------------- Admin

    @Transactional(readOnly = true)
    public PageResponse<SettlementResponse> listAll(User admin, ListQuery query) {
        requireAdmin(admin);
        Page<Settlement> page = settlementRepository.findAll(filter(query.sellerId(), query, true), pageable(query));
        Map<Long, PayoutAccountDto> accounts = accountsOf(page.getContent());
        return PageResponse.of(page, s -> SettlementResponse.from(s, accountOf(accounts, s), true));
    }

    @Transactional(readOnly = true)
    public SettlementSummary summaryAll(User admin) {
        requireAdmin(admin);
        return toSummary(settlementRepository.sumAll());
    }

    /**
     * Ghi nhận đã chuyển khoản cho nhiều khoản cùng lúc (chi trả theo kỳ). Khoản đã trả bị bỏ qua để bấm lại
     * không lỗi; người bán chưa khai báo tài khoản nhận tiền thì chặn cả lô.
     */
    @Transactional
    public List<SettlementResponse> markPaid(User admin, List<Long> ids, String reference) {
        requireAdmin(admin);
        List<Settlement> settlements = settlementRepository.findAllForUpdate(new LinkedHashSet<>(ids));
        if (settlements.size() != new LinkedHashSet<>(ids).size()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "SETTLEMENT_NOT_FOUND", "Có khoản quyết toán không tồn tại");
        }
        Map<Long, PayoutAccountDto> accounts = accountsOf(settlements);
        for (Settlement s : settlements) {
            if (s.getStatus() == SettlementStatus.PAID) {
                continue;
            }
            if (accountOf(accounts, s) == null) {
                throw new ApiException(HttpStatus.CONFLICT, "NO_PAYOUT_ACCOUNT",
                        "Người bán của đơn #" + s.getOrder().getId() + " chưa khai báo tài khoản nhận tiền");
            }
            s.markPaid(admin.getId(), reference.trim());
        }
        settlementRepository.saveAllAndFlush(settlements);
        return settlements.stream().map(s -> SettlementResponse.from(s, accountOf(accounts, s), true)).toList();
    }

    // ---------------------------------------------------------------- Helpers

    private Map<Long, PayoutAccountDto> accountsOf(List<Settlement> settlements) {
        List<Long> sellerIds = settlements.stream()
                .map(Settlement::getSeller).filter(Objects::nonNull).map(User::getId).distinct().toList();
        if (sellerIds.isEmpty()) {
            return Map.of();
        }
        return payoutAccountRepository.findByUserIdIn(sellerIds).stream()
                .collect(Collectors.toMap(PayoutAccount::getUserId, PayoutAccountDto::from));
    }

    private static PayoutAccountDto accountOf(Map<Long, PayoutAccountDto> accounts, Settlement s) {
        return s.getSeller() == null ? null : accounts.get(s.getSeller().getId());
    }

    private static PageRequest pageable(ListQuery query) {
        return PageRequest.of(Math.max(query.page(), 0), Math.max(1, Math.min(query.size(), MAX_PAGE_SIZE)), NEWEST);
    }

    /** admin = được tìm theo email / tên người bán. */
    private static Specification<Settlement> filter(Long sellerId, ListQuery query, boolean admin) {
        return (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (sellerId != null) {
                predicates.add(cb.equal(root.get("seller").get("id"), sellerId));
            }
            if (query.status() != null) {
                predicates.add(cb.equal(root.get("status"), query.status()));
            }
            String q = query.q() == null ? null : query.q().trim();
            if (q != null && !q.isEmpty()) {
                String term = q.startsWith("#") ? q.substring(1) : q;
                List<Predicate> any = new ArrayList<>();
                if (term.matches("\\d{1,18}")) {
                    any.add(cb.equal(root.get("order").get("id"), Long.parseLong(term)));
                }
                if (admin) {
                    String pattern = "%" + term.toLowerCase(Locale.ROOT)
                            .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
                    any.add(cb.like(cb.lower(root.get("seller").get("email")), pattern, '\\'));
                    any.add(cb.like(cb.lower(root.get("seller").get("displayName")), pattern, '\\'));
                }
                predicates.add(any.isEmpty() ? cb.disjunction() : cb.or(any.toArray(Predicate[]::new)));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private SettlementSummary toSummary(List<SettlementRepository.StatusTotal> rows) {
        Map<SettlementStatus, SettlementRepository.StatusTotal> totals = rows.stream()
                .collect(Collectors.toMap(SettlementRepository.StatusTotal::getStatus, Function.identity(),
                        (a, b) -> a, () -> new EnumMap<>(SettlementStatus.class)));
        var pending = totals.get(SettlementStatus.PENDING);
        var paid = totals.get(SettlementStatus.PAID);
        BigDecimal commission = rows.stream().map(SettlementRepository.StatusTotal::getCommissionAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new SettlementSummary(
                pending == null ? BigDecimal.ZERO : pending.getNetAmount(), pending == null ? 0 : pending.getCount(),
                paid == null ? BigDecimal.ZERO : paid.getNetAmount(), paid == null ? 0 : paid.getCount(),
                commission, commissionRate);
    }

    private static void requireAdmin(User user) {
        if (user.getRole() != Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_ONLY", "Chỉ quản trị viên mới xem được mục này");
        }
    }
}
