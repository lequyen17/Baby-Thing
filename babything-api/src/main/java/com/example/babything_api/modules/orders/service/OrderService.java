package com.example.babything_api.modules.orders.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

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
import com.example.babything_api.modules.products.entity.Product;
import com.example.babything_api.modules.products.entity.ProductStatus;
import com.example.babything_api.modules.products.repository.ProductRepository;
import com.example.babything_api.modules.users.entity.Role;
import com.example.babything_api.modules.users.entity.User;

/**
 * Khách xem / tạo / sửa / huỷ đơn của chính mình; admin xem tất cả, đổi trạng thái và huỷ được đơn đã xác nhận.
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

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    public OrderService(OrderRepository orderRepository, ProductRepository productRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
    }

    public record ListQuery(String q, OrderStatus status, String sort, int page, int size) {
    }

    // ---------------------------------------------------------------- Xem danh sách / chi tiết

    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> list(User viewer, ListQuery query) {
        Sort sort = SORTS.get(query.sort() == null ? "newest" : query.sort());
        if (sort == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SORT",
                    "Sort must be one of " + String.join(", ", SORTS.keySet()));
        }
        int page = Math.max(query.page(), 0);
        int size = Math.max(1, Math.min(query.size(), MAX_PAGE_SIZE));
        return PageResponse.of(
                orderRepository.findAll(filter(viewer, query), PageRequest.of(page, size, sort)),
                OrderResponse::from);
    }

    @Transactional(readOnly = true)
    public OrderResponse get(User viewer, Long id) {
        Order order = orderRepository.findDetail(id).orElseThrow(OrderService::notFound);
        checkAccess(viewer, order);
        return OrderResponse.from(order);
    }

    // ---------------------------------------------------------------- Tạo / sửa / huỷ

    @Transactional
    public OrderResponse create(User customer, OrderRequest req) {
        Order order = new Order();
        order.setUser(customer);
        applyShipping(order, req);
        order.replaceItems(reserve(customer, req.items()));
        return OrderResponse.from(orderRepository.saveAndFlush(order));
    }

    /** Chỉ khi đơn còn PENDING. Hoàn kho các dòng cũ rồi trừ lại theo dòng mới, giá lấy theo giá hiện tại. */
    @Transactional
    public OrderResponse update(User viewer, Long id, OrderRequest req) {
        Order order = findForUpdate(viewer, id);
        if (!order.getStatus().isEditable()) {
            throw new ApiException(HttpStatus.CONFLICT, "ORDER_NOT_EDITABLE",
                    "Only pending orders can be changed");
        }
        release(order);
        applyShipping(order, req);
        order.replaceItems(reserve(order.getUser(), req.items()));
        return OrderResponse.from(orderRepository.saveAndFlush(order));
    }

    /** Khách huỷ được khi PENDING; admin huỷ được cả khi đã CONFIRMED (chưa giao cho vận chuyển). */
    @Transactional
    public OrderResponse cancel(User viewer, Long id, String reason) {
        Order order = findForUpdate(viewer, id);
        boolean allowed = isAdmin(viewer)
                ? order.getStatus().isCancellableByAdmin()
                : order.getStatus().isEditable();
        if (!allowed) {
            throw new ApiException(HttpStatus.CONFLICT, "ORDER_NOT_CANCELLABLE",
                    order.getStatus() == OrderStatus.CANCELLED
                            ? "This order is already cancelled"
                            : "This order can no longer be cancelled");
        }
        release(order);
        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelReason(blankToNull(reason));
        order.setCancelledBy(viewer.getId());
        order.setCancelledAt(Instant.now());
        return OrderResponse.from(orderRepository.saveAndFlush(order));
    }

    /** Admin đẩy đơn sang bước kế tiếp. Huỷ phải đi qua cancel() để hoàn kho. */
    @Transactional
    public OrderResponse updateStatus(User admin, Long id, OrderStatus status) {
        if (status == OrderStatus.CANCELLED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "USE_CANCEL",
                    "Use POST /api/orders/{id}/cancel to cancel an order");
        }
        Order order = findForUpdate(admin, id);
        if (!order.getStatus().canMoveTo(status)) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_STATUS_TRANSITION",
                    "Cannot change order from " + order.getStatus() + " to " + status);
        }
        order.setStatus(status);
        return OrderResponse.from(orderRepository.saveAndFlush(order));
    }

    // ---------------------------------------------------------------- Tồn kho

    /**
     * Gộp các dòng trùng sản phẩm, trừ kho theo thứ tự productId (tránh deadlock giữa hai đơn cùng lúc)
     * và chụp lại tên / giá sản phẩm vào dòng hàng. Người mua không được đặt tin đăng của chính mình.
     */
    private List<OrderItem> reserve(User buyer, List<OrderItemRequest> requested) {
        Map<Long, Integer> quantities = new TreeMap<>();
        requested.forEach(i -> quantities.merge(i.productId(), i.quantity(), Integer::sum));

        List<OrderItem> items = new ArrayList<>();
        quantities.forEach((productId, quantity) -> {
            Product product = productRepository.findByIdAndDeletedAtIsNull(productId)
                    .filter(p -> p.getStatus() == ProductStatus.ACTIVE)
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "PRODUCT_UNAVAILABLE",
                            "Product #" + productId + " is no longer available"));
            if (buyer.getId().equals(product.getCreatedBy())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "OWN_PRODUCT",
                        "You cannot order your own listing \"" + product.getName() + "\"");
            }
            if (productRepository.decreaseStock(productId, quantity) == 0) {
                throw new ApiException(HttpStatus.CONFLICT, "OUT_OF_STOCK",
                        "Not enough stock for \"" + product.getName() + "\" (" + product.getStock() + " left)");
            }
            OrderItem item = new OrderItem();
            item.setProductId(productId);
            item.setProductName(product.getName());
            item.setProductSku(product.getSku());
            item.setImageUrl(product.getImageUrl());
            item.setUnitPrice(product.getPrice());
            item.setQuantity(quantity);
            item.setLineTotal(product.getPrice().multiply(BigDecimal.valueOf(quantity)));
            items.add(item);
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

    /** Đơn của người khác trả 404 chứ không phải 403 để không lộ là đơn có tồn tại. */
    private static void checkAccess(User viewer, Order order) {
        if (!isAdmin(viewer) && !order.getUser().getId().equals(viewer.getId())) {
            throw notFound();
        }
    }

    private static void applyShipping(Order order, OrderRequest req) {
        order.setRecipientName(req.recipientName().trim());
        order.setPhone(req.phone().trim());
        order.setAddress(req.address().trim());
        order.setNote(blankToNull(req.note()));
    }

    private static Specification<Order> filter(User viewer, ListQuery query) {
        boolean admin = isAdmin(viewer);
        return (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (!admin) {
                predicates.add(cb.equal(root.get("user").get("id"), viewer.getId()));
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
        return new ApiException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", "Order not found");
    }
}
