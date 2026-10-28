package com.example.babything_api.modules.orders.service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;

import com.example.babything_api.config.AppProperties;
import com.example.babything_api.core.dto.PageResponse;
import com.example.babything_api.core.exceptions.ApiException;
import com.example.babything_api.modules.orders.dto.OrderItemRequest;
import com.example.babything_api.modules.orders.dto.OrderRequest;
import com.example.babything_api.modules.orders.dto.OrderResponse;
import com.example.babything_api.modules.orders.entity.Order;
import com.example.babything_api.modules.orders.entity.OrderItem;
import com.example.babything_api.modules.orders.entity.OrderStatus;
import com.example.babything_api.modules.orders.repository.OrderRepository;
import com.example.babything_api.modules.cart.service.CartService;
import com.example.babything_api.modules.notifications.service.NotificationService;
import com.example.babything_api.modules.payments.entity.PaymentStatus;
import com.example.babything_api.modules.payments.service.PaymentService;
import com.example.babything_api.modules.settlements.service.SettlementService;
import com.example.babything_api.modules.products.entity.Product;
import com.example.babything_api.modules.products.entity.ProductStatus;
import com.example.babything_api.modules.products.repository.ProductRepository;
import com.example.babything_api.modules.users.entity.Role;
import com.example.babything_api.modules.users.entity.User;

/**
 * Mỗi đơn thuộc một người mua và một người bán; đặt hàng của nhiều người bán cùng lúc thì tách thành nhiều đơn.
 * Luồng (OrderStatus): đặt → thanh toán (PaymentService) → người bán xác nhận / giao → người mua xác nhận nhận hàng
 * → quyết toán người bán (SettlementService). Người mua sửa đơn khi chưa thanh toán, huỷ khi người bán chưa xác nhận;
 * người bán huỷ được cả khi đã CONFIRMED. Huỷ đơn đã thanh toán thì hoàn tiền. Admin làm được mọi việc trên mọi đơn.
 * Tồn kho bị trừ ngay khi đặt và được hoàn lại khi huỷ hoặc khi sửa bớt hàng.
 */
@Service
public class OrderService {

    public static final int MAX_PAGE_SIZE = 50;

    private static final Map<String, Sort> SORTS = Map.of(
            "newest", Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")),
            "oldest", Sort.by(Sort.Order.asc("createdAt"), Sort.Order.asc("id")),
            "total_desc", Sort.by(Sort.Order.desc("totalAmount"), Sort.Order.desc("id")),
            "total_asc", Sort.by(Sort.Order.asc("totalAmount"), Sort.Order.desc("id")));

    /** buying = đơn mình đặt, selling = đơn đặt tin của mình. Bỏ trống: admin thấy tất cả, thành viên thấy đơn mua. */
    private static final List<String> VIEWS = List.of("buying", "selling");

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final PaymentService paymentService;
    private final SettlementService settlementService;
    private final AppProperties.Marketplace marketplace;
    private final NotificationService notifications;
    private final CartService cartService;

    public OrderService(OrderRepository orderRepository, ProductRepository productRepository,
            PaymentService paymentService, SettlementService settlementService, AppProperties props,
            NotificationService notifications, CartService cartService) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.paymentService = paymentService;
        this.settlementService = settlementService;
        this.marketplace = props.marketplace();
        this.notifications = notifications;
        this.cartService = cartService;
    }

    /** Báo cho người bán có đơn mới, hoặc cho bên còn lại khi đơn đổi trạng thái / bị huỷ (không báo cho chính người thao tác). */
    private void notifyOrder(Order order, User actor, String title, String body) {
        String link = "/orders/" + order.getId();
        if (order.getUser() != null && !order.getUser().getId().equals(actor.getId())) {
            notifications.notify(order.getUser().getId(), NotificationService.ORDER, title, body, link);
        }
        if (order.getSeller() != null && !order.getSeller().getId().equals(actor.getId())) {
            notifications.notify(order.getSeller().getId(), NotificationService.ORDER, title, body, link);
        }
    }

    /**
     * seller, from, to, attention chỉ có tác dụng với admin (trang quản trị đơn):
     * seller = tên / email người bán; from, to = ngày đặt (giờ Việt Nam, tính cả hai đầu); attention xem ATTENTIONS.
     */
    public record ListQuery(String view, String q, OrderStatus status, String sort, int page, int size,
            String seller, LocalDate from, LocalDate to, String attention) {

        public ListQuery(String view, String q, OrderStatus status, String sort, int page, int size) {
            this(view, q, status, sort, page, size, null, null, null, null);
        }
    }

    /**
     * Đơn admin cần để mắt tới:
     * slow_confirm = đã thanh toán quá CONFIRM_WINDOW mà người bán chưa xác nhận;
     * slow_ship = đã xác nhận quá SHIP_WINDOW mà chưa giao cho vận chuyển;
     * inspection_ending = còn dưới INSPECTION_WARNING là hết hạn kiểm hàng (sắp tự hoàn tất).
     */
    public static final List<String> ATTENTIONS = List.of("slow_confirm", "slow_ship", "inspection_ending");
    private static final Duration CONFIRM_WINDOW = Duration.ofHours(24);
    private static final Duration SHIP_WINDOW = Duration.ofHours(48);
    private static final Duration INSPECTION_WARNING = Duration.ofHours(12);
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    /** Số đơn / tổng tiền theo trạng thái và số đơn cần chú ý, cho đầu trang quản trị đơn. */
    public record AdminStats(Map<OrderStatus, StatusCount> byStatus, Map<String, Long> attention) {
    }

    public record StatusCount(long count, BigDecimal amount) {
    }

    /** Dòng hàng vừa trừ kho, kèm người bán để tách đơn. */
    private record Reserved(User seller, OrderItem item) {
    }

    // ---------------------------------------------------------------- Xem danh sách / chi tiết

    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> list(User viewer, ListQuery query) {
        Sort sort = SORTS.get(query.sort() == null ? "newest" : query.sort());
        if (sort == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SORT",
                    "Kiểu sắp xếp phải là một trong: " + String.join(", ", SORTS.keySet()));
        }
        String view = blankToNull(query.view());
        if (view == null && !isAdmin(viewer)) {
            view = "buying";
        }
        if (view != null && !VIEWS.contains(view)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_VIEW",
                    "Tham số view phải là một trong: " + String.join(", ", VIEWS));
        }
        String attention = blankToNull(query.attention());
        if (attention != null && !ATTENTIONS.contains(attention)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ATTENTION",
                    "Tham số attention phải là một trong: " + String.join(", ", ATTENTIONS));
        }
        if (query.from() != null && query.to() != null && query.from().isAfter(query.to())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DATE_RANGE", "Ngày bắt đầu phải trước ngày kết thúc");
        }
        int page = Math.max(query.page(), 0);
        int size = Math.max(1, Math.min(query.size(), MAX_PAGE_SIZE));
        return PageResponse.of(
                orderRepository.findAll(filter(viewer, view, query), PageRequest.of(page, size, sort)),
                o -> toResponse(viewer, o));
    }

    @Transactional(readOnly = true)
    public AdminStats adminStats(User admin) {
        if (!isAdmin(admin)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_ONLY", "Chỉ quản trị viên mới xem được thống kê này");
        }
        Map<OrderStatus, StatusCount> byStatus = new EnumMap<>(OrderStatus.class);
        for (OrderStatus s : OrderStatus.values()) {
            byStatus.put(s, new StatusCount(0, BigDecimal.ZERO));
        }
        for (Object[] row : orderRepository.countByStatus()) {
            byStatus.put((OrderStatus) row[0], new StatusCount((Long) row[1], (BigDecimal) row[2]));
        }
        Map<String, Long> attention = new LinkedHashMap<>();
        for (String key : ATTENTIONS) {
            attention.put(key, orderRepository.count((root, cq, cb) -> attentionPredicate(key, root, cb)));
        }
        return new AdminStats(byStatus, attention);
    }

    @Transactional(readOnly = true)
    public OrderResponse get(User viewer, Long id) {
        Order order = orderRepository.findDetail(id).orElseThrow(OrderService::notFound);
        checkAccess(viewer, order);
        return toResponse(viewer, order);
    }

    // ---------------------------------------------------------------- Tạo / sửa / huỷ

    /** Trả về một đơn cho mỗi người bán, theo thứ tự sản phẩm đầu tiên của người bán đó trong yêu cầu. */
    @Transactional
    public List<OrderResponse> create(User customer, OrderRequest req) {
        Map<Long, List<Reserved>> bySeller = new LinkedHashMap<>();
        reserve(customer, quantities(req.items())).forEach(r ->
                bySeller.computeIfAbsent(r.seller() == null ? null : r.seller().getId(), k -> new ArrayList<>()).add(r));

        List<OrderResponse> created = new ArrayList<>();
        Instant paymentDueAt = Instant.now().plus(marketplace.paymentWindow());
        for (List<Reserved> group : bySeller.values()) {
            Order order = new Order();
            order.setUser(customer);
            order.setSeller(group.get(0).seller());
            order.setPaymentDueAt(paymentDueAt);
            applyShipping(order, req);
            order.replaceItems(group.stream().map(Reserved::item).toList());
            Order saved = orderRepository.saveAndFlush(order);
            if (saved.getSeller() != null) {
                notifications.notify(saved.getSeller().getId(), NotificationService.ORDER,
                        "Bạn có đơn hàng mới #" + saved.getId(),
                        customer.getDisplayName() + " vừa đặt mua " + saved.getItems().size() + " sản phẩm của bạn.",
                        "/orders/" + saved.getId());
            }
            created.add(toResponse(customer, saved));
        }
        // Đặt từ giỏ hay "Mua ngay" thì sản phẩm đã đặt cũng không cần nằm trong giỏ nữa
        cartService.removeOrdered(customer.getId(), quantities(req.items()).keySet());
        return created;
    }

    /**
     * Chỉ người mua (hoặc admin), khi đơn còn PENDING. Dòng giữ nguyên hoặc giảm số lượng thì giữ giá lúc đặt và chỉ
     * hoàn phần bớt đi, nên vẫn sửa được khi sản phẩm đã bị ẩn / xoá. Dòng mới hoặc tăng số lượng thì hoàn kho dòng
     * cũ rồi trừ lại toàn bộ theo giá hiện tại. Mọi sản phẩm phải cùng người bán với đơn; muốn mua của người khác
     * thì đặt đơn mới.
     */
    @Transactional
    public OrderResponse update(User viewer, Long id, OrderRequest req) {
        Order order = findForUpdate(viewer, id);
        if (!isAdmin(viewer) && !isBuyer(viewer, order)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "NOT_ORDER_BUYER", "Chỉ người mua mới sửa được đơn này");
        }
        if (!order.getStatus().isEditable()) {
            throw new ApiException(HttpStatus.CONFLICT, "ORDER_NOT_EDITABLE",
                    "Chỉ sửa được đơn chưa thanh toán");
        }
        applyShipping(order, req);

        Map<Long, Integer> wanted = quantities(req.items());
        Map<Long, OrderItem> current = new HashMap<>();
        order.getItems().forEach(item -> current.put(item.getProductId(), item));
        // Hoàn và trừ kho trong cùng một vòng theo productId, để hai lần sửa đơn cùng lúc không khoá chéo nhau
        Set<Long> productIds = new TreeSet<>(wanted.keySet());
        productIds.addAll(current.keySet());

        List<OrderItem> items = new ArrayList<>();
        List<Reserved> reserved = new ArrayList<>();
        for (Long productId : productIds) {
            OrderItem item = current.get(productId);
            Integer quantity = wanted.get(productId);
            if (item != null && quantity != null && quantity <= item.getQuantity()) {
                if (quantity < item.getQuantity()) {
                    productRepository.increaseStock(productId, item.getQuantity() - quantity);
                    item.setQuantity(quantity);
                    item.setLineTotal(item.getUnitPrice().multiply(BigDecimal.valueOf(quantity)));
                }
                items.add(item);
                continue;
            }
            if (item != null) {
                productRepository.increaseStock(productId, item.getQuantity());
            }
            if (quantity != null) {
                Reserved r = reserve(order.getUser(), Map.of(productId, quantity)).get(0);
                reserved.add(r);
                items.add(r.item());
            }
        }

        Long sellerId = sellerId(order);
        reserved.stream()
                .filter(r -> !Objects.equals(r.seller() == null ? null : r.seller().getId(), sellerId))
                .findFirst()
                .ifPresent(r -> {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "DIFFERENT_SELLER",
                            "\"" + r.item().getProductName() + "\" thuộc người bán khác. "
                                    + "Hãy đặt một đơn mới cho sản phẩm này");
                });
        order.replaceItems(items);
        // Tổng tiền có thể đã đổi: giao dịch đang mở chụp số tiền cũ nên phải tạo lại
        paymentService.closePending(order, PaymentStatus.EXPIRED, "Đơn hàng đã được sửa");
        return toResponse(viewer, orderRepository.saveAndFlush(order));
    }

    /**
     * Người mua huỷ được khi người bán chưa xác nhận; người bán / admin huỷ được cả khi đã CONFIRMED
     * (chưa giao cho vận chuyển). Đơn đã thanh toán thì hoàn tiền cho người mua.
     */
    @Transactional
    public OrderResponse cancel(User viewer, Long id, String reason) {
        Order order = findForUpdate(viewer, id);
        boolean allowed = isAdmin(viewer) || isSeller(viewer, order)
                ? order.getStatus().isCancellableBySeller()
                : order.getStatus().isCancellableByBuyer();
        if (!allowed) {
            throw new ApiException(HttpStatus.CONFLICT, "ORDER_NOT_CANCELLABLE",
                    order.getStatus() == OrderStatus.CANCELLED
                            ? "Đơn hàng này đã bị huỷ"
                            : "Đơn hàng này không thể huỷ được nữa");
        }
        doCancel(order, viewer.getId(), blankToNull(reason));
        Order saved = orderRepository.saveAndFlush(order);
        notifyOrder(saved, viewer, "Đơn hàng #" + saved.getId() + " đã bị huỷ",
                saved.getCancelReason() == null ? "Đơn đã được huỷ." : "Lý do: " + saved.getCancelReason());
        return toResponse(viewer, saved);
    }

    /**
     * Người bán / admin đẩy đơn sang bước kế tiếp. Huỷ phải đi qua cancel() để hoàn kho / hoàn tiền;
     * PENDING chỉ đến được bằng thanh toán, COMPLETED bằng receive().
     */
    @Transactional
    public OrderResponse updateStatus(User viewer, Long id, OrderStatus status, String trackingCode) {
        if (status == OrderStatus.CANCELLED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "USE_CANCEL",
                    "Dùng POST /api/orders/{id}/cancel để huỷ đơn");
        }
        Order order = findForUpdate(viewer, id);
        if (!isAdmin(viewer) && !isSeller(viewer, order)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "NOT_ORDER_SELLER",
                    "Chỉ người bán hoặc quản trị viên mới cập nhật được đơn này");
        }
        if (!order.getStatus().canMoveTo(status)) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_STATUS_TRANSITION",
                    order.getStatus() == OrderStatus.AWAITING_PAYMENT
                            ? "Người mua chưa thanh toán đơn này"
                            : "Không thể chuyển đơn từ \"" + order.getStatus().label() + "\" sang \""
                                    + status.label() + "\"");
        }
        if (status == OrderStatus.SHIPPING) {
            String code = blankToNull(trackingCode);
            if (code == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "TRACKING_CODE_REQUIRED",
                        "Vui lòng nhập mã vận đơn khi giao hàng cho đơn vị vận chuyển");
            }
            order.setTrackingCode(code);
        }
        order.setStatus(status);
        Order saved = orderRepository.saveAndFlush(order);
        notifyOrder(saved, viewer, "Đơn hàng #" + saved.getId() + " chuyển sang \"" + status.label() + "\"",
                "Mở đơn hàng để xem chi tiết.");
        return toResponse(viewer, saved);
    }

    /**
     * Người mua (hoặc admin) xác nhận đã nhận hàng đúng mô tả: đơn hoàn tất và người bán được ghi nhận khoản
     * quyết toán. Không xác nhận thì job tự hoàn tất khi hết thời hạn kiểm hàng.
     */
    @Transactional
    public OrderResponse receive(User viewer, Long id) {
        Order order = findForUpdate(viewer, id);
        if (!isAdmin(viewer) && !isBuyer(viewer, order)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "NOT_ORDER_BUYER",
                    "Chỉ người mua mới xác nhận đã nhận hàng");
        }
        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new ApiException(HttpStatus.CONFLICT, "ORDER_NOT_DELIVERED",
                    "Chỉ xác nhận được khi đơn đã được giao");
        }
        complete(order);
        return toResponse(viewer, orderRepository.saveAndFlush(order));
    }

    // ---------------------------------------------------------------- Job (OrderJobs)

    /** Huỷ đơn quá hạn thanh toán, trả hàng về kho. Trả false nếu đơn đã được thanh toán / huỷ trong lúc chờ. */
    @Transactional
    public boolean expireUnpaid(Long id) {
        Order order = orderRepository.findForUpdate(id).orElse(null);
        if (order == null || order.getStatus() != OrderStatus.AWAITING_PAYMENT
                || order.getPaymentDueAt() == null || Instant.now().isBefore(order.getPaymentDueAt())) {
            return false;
        }
        doCancel(order, null, "Quá hạn thanh toán");
        orderRepository.save(order);
        return true;
    }

    /** Hết thời hạn kiểm hàng mà người mua không xác nhận: tự hoàn tất. */
    @Transactional
    public boolean autoComplete(Long id) {
        Order order = orderRepository.findForUpdate(id).orElse(null);
        if (order == null || order.getStatus() != OrderStatus.DELIVERED || order.getDeliveredAt() == null
                || Instant.now().isBefore(order.getDeliveredAt().plus(marketplace.inspectionPeriod()))) {
            return false;
        }
        complete(order);
        orderRepository.save(order);
        return true;
    }

    @Transactional(readOnly = true)
    public List<Long> findOverdueUnpaid() {
        return orderRepository.findIdsByStatusAndPaymentDueAtBefore(OrderStatus.AWAITING_PAYMENT, Instant.now());
    }

    @Transactional(readOnly = true)
    public List<Long> findInspectionEnded() {
        return orderRepository.findIdsByStatusAndDeliveredAtBefore(OrderStatus.DELIVERED,
                Instant.now().minus(marketplace.inspectionPeriod()));
    }

    // ---------------------------------------------------------------- Chuyển trạng thái (đơn đã khoá)

    /** cancelledBy null = hệ thống. */
    private void doCancel(Order order, Long cancelledBy, String reason) {
        if (order.getPaidAt() != null) {
            paymentService.refundForOrder(order);
        } else {
            paymentService.closePending(order, PaymentStatus.FAILED, "Đơn hàng đã bị huỷ");
        }
        release(order);
        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelReason(reason);
        order.setCancelledBy(cancelledBy);
        order.setCancelledAt(Instant.now());
    }

    private void complete(Order order) {
        order.setStatus(OrderStatus.COMPLETED);
        settlementService.createFor(order);
    }

    // ---------------------------------------------------------------- Tồn kho

    /** Gộp các dòng trùng sản phẩm; TreeMap để trừ kho theo thứ tự productId (tránh deadlock giữa hai đơn cùng lúc). */
    private static Map<Long, Integer> quantities(List<OrderItemRequest> requested) {
        Map<Long, Integer> quantities = new TreeMap<>();
        requested.forEach(i -> quantities.merge(i.productId(), i.quantity(), Integer::sum));
        return quantities;
    }

    /**
     * Trừ kho theo thứ tự của quantities và chụp lại tên / giá sản phẩm vào dòng hàng.
     * Người mua không được đặt tin đăng của chính mình.
     */
    private List<Reserved> reserve(User buyer, Map<Long, Integer> quantities) {
        List<Reserved> items = new ArrayList<>();
        quantities.forEach((productId, quantity) -> {
            Product product = productRepository.findByIdAndDeletedAtIsNull(productId)
                    .filter(p -> p.getStatus() == ProductStatus.ACTIVE)
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "PRODUCT_UNAVAILABLE",
                            "Sản phẩm #" + productId + " không còn bán nữa"));
            if (buyer.getId().equals(product.getCreatedBy())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "OWN_PRODUCT",
                        "Bạn không thể đặt mua tin đăng của chính mình \"" + product.getName() + "\"");
            }
            if (productRepository.decreaseStock(productId, quantity) == 0) {
                throw new ApiException(HttpStatus.CONFLICT, "OUT_OF_STOCK",
                        "\"" + product.getName() + "\" không đủ hàng (chỉ còn " + product.getStock() + ")");
            }
            OrderItem item = new OrderItem();
            item.setProductId(productId);
            item.snapshot(product);
            item.setQuantity(quantity);
            item.setLineTotal(product.getPrice().multiply(BigDecimal.valueOf(quantity)));
            items.add(new Reserved(product.getSeller(), item));
        });
        return items;
    }

    private void release(Order order) {
        order.getItems().stream()
                .sorted(Comparator.comparing(OrderItem::getProductId))
                .forEach(i -> productRepository.increaseStock(i.getProductId(), i.getQuantity()));
    }

    // ---------------------------------------------------------------- Helpers

    private Order findForUpdate(User viewer, Long id) {
        Order order = orderRepository.findForUpdate(id).orElseThrow(OrderService::notFound);
        checkAccess(viewer, order);
        return order;
    }

    /** Đơn không liên quan trả 404 chứ không phải 403 để không lộ là đơn có tồn tại. */
    private static void checkAccess(User viewer, Order order) {
        if (!isAdmin(viewer) && !isBuyer(viewer, order) && !isSeller(viewer, order)) {
            throw notFound();
        }
    }

    /** Người bán chỉ cần thông tin giao hàng, không thấy email tài khoản của người mua. */
    private OrderResponse toResponse(User viewer, Order order) {
        Instant inspectionEndsAt = order.getStatus() == OrderStatus.DELIVERED && order.getDeliveredAt() != null
                ? order.getDeliveredAt().plus(marketplace.inspectionPeriod())
                : null;
        return OrderResponse.from(order, isAdmin(viewer) || isBuyer(viewer, order), inspectionEndsAt);
    }

    private static void applyShipping(Order order, OrderRequest req) {
        order.setRecipientName(req.recipientName().trim());
        order.setPhone(req.phone().trim());
        order.setAddress(req.address().trim());
        order.setNote(blankToNull(req.note()));
    }

    private Predicate attentionPredicate(String key, Root<Order> root, CriteriaBuilder cb) {
        Instant now = Instant.now();
        return switch (key) {
            case "slow_confirm" -> cb.and(cb.equal(root.get("status"), OrderStatus.PENDING),
                    cb.lessThan(root.get("paidAt"), now.minus(CONFIRM_WINDOW)));
            case "slow_ship" -> cb.and(cb.equal(root.get("status"), OrderStatus.CONFIRMED),
                    cb.lessThan(root.get("confirmedAt"), now.minus(SHIP_WINDOW)));
            case "inspection_ending" -> cb.and(cb.equal(root.get("status"), OrderStatus.DELIVERED),
                    cb.lessThan(root.get("deliveredAt"),
                            now.minus(marketplace.inspectionPeriod()).plus(INSPECTION_WARNING)));
            default -> throw new IllegalArgumentException(key);
        };
    }

    private Specification<Order> filter(User viewer, String view, ListQuery query) {
        boolean admin = isAdmin(viewer);
        return (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if ("buying".equals(view)) {
                predicates.add(cb.equal(root.get("user").get("id"), viewer.getId()));
            } else if ("selling".equals(view)) {
                predicates.add(cb.equal(root.get("seller").get("id"), viewer.getId()));
            }
            if (query.status() != null) {
                predicates.add(cb.equal(root.get("status"), query.status()));
            }
            String q = blankToNull(query.q());
            if (q != null) {
                String term = q.startsWith("#") ? q.substring(1) : q;
                String pattern = "%" + escapeLike(term.toLowerCase(Locale.ROOT)) + "%";
                List<Predicate> any = new ArrayList<>();
                any.add(cb.like(cb.lower(root.get("recipientName")), pattern, '\\'));
                any.add(cb.like(root.get("phone"), pattern, '\\'));
                if (admin) {
                    any.add(cb.like(cb.lower(root.get("user").get("email")), pattern, '\\'));
                }
                if (term.matches("\\d{1,18}")) {
                    any.add(cb.equal(root.get("id"), Long.parseLong(term)));
                }
                predicates.add(cb.or(any.toArray(Predicate[]::new)));
            }
            if (admin) {
                String seller = blankToNull(query.seller());
                if (seller != null) {
                    String pattern = "%" + escapeLike(seller.toLowerCase(Locale.ROOT)) + "%";
                    var s = root.join("seller", JoinType.LEFT);
                    predicates.add(cb.or(cb.like(cb.lower(s.get("email")), pattern, '\\'),
                            cb.like(cb.lower(s.get("displayName")), pattern, '\\')));
                }
                if (query.from() != null) {
                    predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"),
                            query.from().atStartOfDay(VN_ZONE).toInstant()));
                }
                if (query.to() != null) {
                    predicates.add(cb.lessThan(root.get("createdAt"),
                            query.to().plusDays(1).atStartOfDay(VN_ZONE).toInstant()));
                }
                String attention = blankToNull(query.attention());
                if (attention != null) {
                    predicates.add(attentionPredicate(attention, root, cb));
                }
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private static boolean isAdmin(User user) {
        return user.getRole() == Role.ADMIN;
    }

    private static boolean isBuyer(User user, Order order) {
        return order.getUser().getId().equals(user.getId());
    }

    private static boolean isSeller(User user, Order order) {
        return user.getId().equals(sellerId(order));
    }

    private static Long sellerId(Order order) {
        return order.getSeller() == null ? null : order.getSeller().getId();
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
        return new ApiException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng");
    }
}
