package com.example.babything_api.modules.orders.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
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

import jakarta.persistence.criteria.Predicate;

import com.example.babything_api.core.dto.PageResponse;
import com.example.babything_api.core.exceptions.ApiException;
import com.example.babything_api.modules.orders.dto.OrderItemRequest;
import com.example.babything_api.modules.orders.dto.OrderRequest;
import com.example.babything_api.modules.orders.dto.OrderResponse;
import com.example.babything_api.modules.orders.entity.Order;
import com.example.babything_api.modules.orders.entity.OrderItem;
import com.example.babything_api.modules.orders.entity.OrderStatus;
import com.example.babything_api.modules.orders.repository.OrderRepository;
import com.example.babything_api.modules.notifications.service.NotificationService;
import com.example.babything_api.modules.products.entity.Product;
import com.example.babything_api.modules.products.entity.ProductStatus;
import com.example.babything_api.modules.products.repository.ProductRepository;
import com.example.babything_api.modules.users.entity.Role;
import com.example.babything_api.modules.users.entity.User;

/**
 * Mỗi đơn thuộc một người mua và một người bán; đặt hàng của nhiều người bán cùng lúc thì tách thành nhiều đơn.
 * Người mua xem / sửa / huỷ đơn của mình khi còn PENDING. Người bán xem đơn bán, chuyển trạng thái và huỷ được
 * cả khi đã CONFIRMED. Admin làm được mọi việc trên mọi đơn.
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

    private final NotificationService notifications;

    public OrderService(OrderRepository orderRepository, ProductRepository productRepository,
            NotificationService notifications) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.notifications = notifications;
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

    public record ListQuery(String view, String q, OrderStatus status, String sort, int page, int size) {
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
        int page = Math.max(query.page(), 0);
        int size = Math.max(1, Math.min(query.size(), MAX_PAGE_SIZE));
        return PageResponse.of(
                orderRepository.findAll(filter(viewer, view, query), PageRequest.of(page, size, sort)),
                o -> toResponse(viewer, o));
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
        for (List<Reserved> group : bySeller.values()) {
            Order order = new Order();
            order.setUser(customer);
            order.setSeller(group.get(0).seller());
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
                    "Chỉ sửa được đơn đang chờ xác nhận");
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
        return toResponse(viewer, orderRepository.saveAndFlush(order));
    }

    /** Người mua huỷ được khi PENDING; người bán / admin huỷ được cả khi đã CONFIRMED (chưa giao cho vận chuyển). */
    @Transactional
    public OrderResponse cancel(User viewer, Long id, String reason) {
        Order order = findForUpdate(viewer, id);
        boolean allowed = isAdmin(viewer) || isSeller(viewer, order)
                ? order.getStatus().isCancellableBySeller()
                : order.getStatus().isEditable();
        if (!allowed) {
            throw new ApiException(HttpStatus.CONFLICT, "ORDER_NOT_CANCELLABLE",
                    order.getStatus() == OrderStatus.CANCELLED
                            ? "Đơn hàng này đã bị huỷ"
                            : "Đơn hàng này không thể huỷ được nữa");
        }
        release(order);
        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelReason(blankToNull(reason));
        order.setCancelledBy(viewer.getId());
        order.setCancelledAt(Instant.now());
        Order saved = orderRepository.saveAndFlush(order);
        notifyOrder(saved, viewer, "Đơn hàng #" + saved.getId() + " đã bị huỷ",
                saved.getCancelReason() == null ? "Đơn đã được huỷ." : "Lý do: " + saved.getCancelReason());
        return toResponse(viewer, saved);
    }

    /** Người bán / admin đẩy đơn sang bước kế tiếp. Huỷ phải đi qua cancel() để hoàn kho. */
    @Transactional
    public OrderResponse updateStatus(User viewer, Long id, OrderStatus status) {
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
                    "Không thể chuyển đơn từ \"" + order.getStatus().label() + "\" sang \"" + status.label() + "\"");
        }
        order.setStatus(status);
        Order saved = orderRepository.saveAndFlush(order);
        notifyOrder(saved, viewer, "Đơn hàng #" + saved.getId() + " chuyển sang \"" + status.label() + "\"",
                "Mở đơn hàng để xem chi tiết.");
        return toResponse(viewer, saved);
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
            item.setProductName(product.getName());
            item.setProductSku(product.getSku());
            item.setImageUrl(product.getImageUrl());
            item.setUnitPrice(product.getPrice());
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
    private static OrderResponse toResponse(User viewer, Order order) {
        return OrderResponse.from(order, isAdmin(viewer) || isBuyer(viewer, order));
    }

    private static void applyShipping(Order order, OrderRequest req) {
        order.setRecipientName(req.recipientName().trim());
        order.setPhone(req.phone().trim());
        order.setAddress(req.address().trim());
        order.setNote(blankToNull(req.note()));
    }

    private static Specification<Order> filter(User viewer, String view, ListQuery query) {
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
