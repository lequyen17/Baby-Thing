package com.example.babything_api.modules.cart.service;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.babything_api.core.exceptions.ApiException;
import com.example.babything_api.modules.cart.dto.CartDtos.CartResponse;
import com.example.babything_api.modules.cart.dto.CartDtos.Item;
import com.example.babything_api.modules.cart.entity.CartItem;
import com.example.babything_api.modules.cart.repository.CartItemRepository;
import com.example.babything_api.modules.products.entity.Product;
import com.example.babything_api.modules.products.entity.ProductStatus;
import com.example.babything_api.modules.products.repository.ProductRepository;
import com.example.babything_api.modules.users.entity.Role;
import com.example.babything_api.modules.users.entity.User;

/**
 * Giỏ hàng: chỉ là danh sách chờ, không giữ hàng. Kho chỉ bị trừ khi đặt hàng (OrderService), nên lúc xem giỏ
 * phải kiểm tra lại từng dòng (tin bị ẩn / xoá / hết hàng thì báo, không tự xoá để người mua biết chuyện gì xảy ra).
 * Đặt hàng thành công thì OrderService gọi removeOrdered để bỏ các sản phẩm đó khỏi giỏ.
 */
@Service
public class CartService {

    public static final int MAX_LINES = 50;

    private final CartItemRepository cartRepository;
    private final ProductRepository productRepository;

    public CartService(CartItemRepository cartRepository, ProductRepository productRepository) {
        this.cartRepository = cartRepository;
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public CartResponse get(User user) {
        List<Item> items = cartRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(CartService::toItem)
                .toList();
        List<Item> available = items.stream().filter(Item::available).toList();
        BigDecimal total = available.stream()
                .map(i -> i.price().multiply(BigDecimal.valueOf(i.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new CartResponse(items, available.size(), total);
    }

    @Transactional(readOnly = true)
    public long count(User user) {
        return cartRepository.countByUserId(user.getId());
    }

    /** Thêm vào giỏ; sản phẩm đã có thì cộng dồn số lượng (không vượt tồn kho). */
    @Transactional
    public CartResponse add(User user, Long productId, Integer quantity) {
        requireBuyer(user);
        int qty = quantity == null ? 1 : quantity;
        Product product = productRepository.findByIdAndDeletedAtIsNull(productId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm"));
        if (user.getId().equals(product.getCreatedBy())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OWN_PRODUCT", "Không thể thêm tin đăng của chính bạn vào giỏ");
        }
        if (product.getStatus() != ProductStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "PRODUCT_NOT_AVAILABLE", "Sản phẩm này hiện không còn bán");
        }
        CartItem item = cartRepository.findByUserIdAndProductId(user.getId(), productId).orElse(null);
        int total = (item == null ? 0 : item.getQuantity()) + qty;
        checkStock(product, total, item == null ? 0 : item.getQuantity());
        if (item == null) {
            if (cartRepository.countByUserId(user.getId()) >= MAX_LINES) {
                throw new ApiException(HttpStatus.CONFLICT, "CART_FULL",
                        "Giỏ hàng tối đa " + MAX_LINES + " sản phẩm. Vui lòng đặt hoặc bỏ bớt trước khi thêm");
            }
            try {
                cartRepository.saveAndFlush(CartItem.of(user.getId(), product, qty));
            } catch (DataIntegrityViolationException e) {
                // Hai yêu cầu thêm cùng sản phẩm chạy song song (bấm hai lần): dòng kia đã thêm rồi
                throw new ApiException(HttpStatus.CONFLICT, "CART_CHANGED", "Sản phẩm vừa được thêm vào giỏ");
            }
        } else {
            item.setQuantity(total);
        }
        return get(user);
    }

    @Transactional
    public CartResponse setQuantity(User user, Long productId, int quantity) {
        CartItem item = find(user, productId);
        Product product = item.getProduct();
        // Dòng không còn đặt được thì vẫn cho giảm số lượng / xoá, chỉ chặn tăng
        if (quantity > item.getQuantity()) {
            if (product.getDeletedAt() != null || product.getStatus() != ProductStatus.ACTIVE) {
                throw new ApiException(HttpStatus.CONFLICT, "PRODUCT_NOT_AVAILABLE", "Sản phẩm này hiện không còn bán");
            }
            checkStock(product, quantity, item.getQuantity());
        }
        item.setQuantity(quantity);
        return get(user);
    }

    @Transactional
    public CartResponse remove(User user, Long productId) {
        cartRepository.delete(find(user, productId));
        return get(user);
    }

    /** productIds rỗng / null = xoá cả giỏ. */
    @Transactional
    public CartResponse removeMany(User user, Collection<Long> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            cartRepository.deleteAllByUserId(user.getId());
        } else {
            cartRepository.deleteByUserIdAndProductIds(user.getId(), productIds);
        }
        return get(user);
    }

    /** Gọi trong transaction đặt hàng: sản phẩm đã đặt thì bỏ khỏi giỏ. */
    @Transactional
    public void removeOrdered(Long userId, Collection<Long> productIds) {
        if (!productIds.isEmpty()) {
            cartRepository.deleteByUserIdAndProductIds(userId, productIds);
        }
    }

    // ----------------------------------------------------------------

    private CartItem find(User user, Long productId) {
        return cartRepository.findByUserIdAndProductId(user.getId(), productId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CART_ITEM_NOT_FOUND",
                        "Sản phẩm không có trong giỏ"));
    }

    private static void requireBuyer(User user) {
        if (user.getRole() == Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_CANNOT_BUY", "Tài khoản quản trị không mua hàng");
        }
    }

    private static void checkStock(Product product, int wanted, int alreadyInCart) {
        if (product.getStock() <= 0) {
            throw new ApiException(HttpStatus.CONFLICT, "OUT_OF_STOCK", "\"" + product.getName() + "\" đã hết hàng");
        }
        if (wanted > product.getStock()) {
            throw new ApiException(HttpStatus.CONFLICT, "NOT_ENOUGH_STOCK",
                    "\"" + product.getName() + "\" chỉ còn " + product.getStock()
                            + (alreadyInCart > 0 ? " (giỏ của bạn đã có " + alreadyInCart + ")" : ""));
        }
    }

    private static Item toItem(CartItem c) {
        Product p = c.getProduct();
        String reason = null;
        if (p.getDeletedAt() != null) {
            reason = "Tin đã bị xoá";
        } else if (p.getStatus() != ProductStatus.ACTIVE) {
            reason = "Tin tạm ngừng bán";
        } else if (p.getStock() <= 0) {
            reason = "Hết hàng";
        } else if (p.getStock() < c.getQuantity()) {
            reason = "Chỉ còn " + p.getStock() + ", giảm số lượng để đặt";
        }
        var seller = p.getSeller();
        return new Item(p.getId(), p.getName(), p.getSku(), p.getImageUrl(), p.getCategory(), p.getCondition(),
                p.getPrice(), c.getPriceAtAdd(), p.getStock(), c.getQuantity(), p.getCreatedBy(),
                seller == null ? null : seller.getDisplayName(), reason == null, reason, c.getCreatedAt());
    }
}
