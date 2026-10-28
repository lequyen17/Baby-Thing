package com.example.babything_api.modules.products.controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;

import com.example.babything_api.core.dto.PageResponse;
import com.example.babything_api.core.security.AuthPrincipal;
import com.example.babything_api.infrastructure.cache.RateLimiter;
import com.example.babything_api.infrastructure.storage.ImageStorage;
import com.example.babything_api.modules.products.dto.ProductImageResponse;
import com.example.babything_api.modules.products.dto.ProductRequest;
import com.example.babything_api.modules.products.dto.ProductResponse;
import com.example.babything_api.modules.products.dto.ProductViewStats;
import com.example.babything_api.modules.products.dto.ReviewRequest;
import com.example.babything_api.modules.products.dto.VisibilityRequest;
import com.example.babything_api.modules.products.entity.ProductStatus;
import com.example.babything_api.modules.products.service.ProductService;
import com.example.babything_api.modules.products.service.ProductViewService;

/** Mọi thành viên đăng bán được; sửa/xoá và /{id}/views chỉ cho người bán hoặc ADMIN (kiểm tra trong service). */
@RestController
@RequestMapping("/api/products")
public class ProductController {

    private static final int IMAGE_UPLOADS_PER_MINUTE = 20;

    private final ProductService productService;
    private final ProductViewService viewService;
    private final ImageStorage imageStorage;
    private final RateLimiter rateLimiter;

    public ProductController(ProductService productService, ProductViewService viewService,
            ImageStorage imageStorage, RateLimiter rateLimiter) {
        this.productService = productService;
        this.viewService = viewService;
        this.imageStorage = imageStorage;
        this.rateLimiter = rateLimiter;
    }

    @GetMapping
    PageResponse<ProductResponse> list(@AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) ProductStatus status,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(defaultValue = "false") boolean mine,
            @RequestParam(required = false) Long sellerId,
            @RequestParam(required = false) Boolean renewed,
            @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return productService.list(principal.user(), new ProductService.ListQuery(q, category, status, minPrice,
                maxPrice, mine, sellerId, sort, page, size, renewed));
    }

    @GetMapping("/categories")
    List<String> categories(@AuthenticationPrincipal AuthPrincipal principal) {
        return productService.categories(principal.user());
    }

    @GetMapping("/{id}")
    ProductResponse get(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        return productService.view(principal.user(), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ProductResponse create(@AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody ProductRequest req) {
        return productService.create(principal.user(), req);
    }

    /**
     * Tải ảnh lên trước, rồi gửi URL nhận được trong imageUrl khi tạo / sửa tin.
     * Ảnh cũ không bị xoá khi đổi ảnh vì đơn hàng đã đặt vẫn dùng URL đó.
     */
    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    ProductImageResponse uploadImage(@AuthenticationPrincipal AuthPrincipal principal,
            @RequestPart("file") MultipartFile file) {
        rateLimiter.check("user:" + principal.user().getId(), "product-image", IMAGE_UPLOADS_PER_MINUTE);
        return new ProductImageResponse(imageStorage.store("products/" + principal.user().getId(), file));
    }

    @PutMapping("/{id}")
    ProductResponse update(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
            @Valid @RequestBody ProductRequest req) {
        return productService.update(principal.user(), id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        productService.delete(principal.user(), id);
    }

    @PatchMapping("/{id}/visibility")
    ProductResponse setVisibility(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
            @Valid @RequestBody VisibilityRequest req) {
        return productService.setVisibility(principal.user(), id, req.visible());
    }

    // ---------------------------------------------------------------- Kiểm duyệt (chỉ ADMIN, kiểm tra trong service)

    @GetMapping("/review-count")
    Map<String, Long> reviewCount(@AuthenticationPrincipal AuthPrincipal principal) {
        return Map.of("pending", productService.countPendingReview(principal.user()));
    }

    @PostMapping("/{id}/approve")
    ProductResponse approve(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        return productService.approve(principal.user(), id);
    }

    @PostMapping("/{id}/reject")
    ProductResponse reject(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
            @Valid @RequestBody ReviewRequest req) {
        return productService.reject(principal.user(), id, req.reason());
    }

    @GetMapping("/{id}/views")
    ProductViewStats viewers(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return viewService.viewers(principal.user(), id, page, size);
    }
}
