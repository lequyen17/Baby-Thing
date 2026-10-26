package com.example.babything_api.modules.products.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.babything_api.core.dto.PageResponse;
import com.example.babything_api.core.security.AuthPrincipal;
import com.example.babything_api.modules.products.dto.ProductHistoryItem;
import com.example.babything_api.modules.products.service.ProductViewService;

/** Lịch sử xem sản phẩm của người đang đăng nhập. */
@RestController
@RequestMapping("/api/users/me/product-history")
public class ProductHistoryController {

    private final ProductViewService viewService;

    public ProductHistoryController(ProductViewService viewService) {
        this.viewService = viewService;
    }

    @GetMapping
    PageResponse<ProductHistoryItem> list(@AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return viewService.myHistory(principal.user(), page, size);
    }

    @DeleteMapping("/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void remove(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long productId) {
        viewService.removeFromHistory(principal.user(), productId);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void clear(@AuthenticationPrincipal AuthPrincipal principal) {
        viewService.clearHistory(principal.user());
    }
}
