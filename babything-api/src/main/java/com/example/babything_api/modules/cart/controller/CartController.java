package com.example.babything_api.modules.cart.controller;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import com.example.babything_api.core.security.AuthPrincipal;
import com.example.babything_api.modules.cart.dto.CartDtos.AddRequest;
import com.example.babything_api.modules.cart.dto.CartDtos.CartResponse;
import com.example.babything_api.modules.cart.dto.CartDtos.CountResponse;
import com.example.babything_api.modules.cart.dto.CartDtos.QuantityRequest;
import com.example.babything_api.modules.cart.service.CartService;

/** Giỏ hàng của người đang đăng nhập. Các thao tác ghi đều trả lại cả giỏ để giao diện vẽ lại một lần. */
@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    CartResponse get(@AuthenticationPrincipal AuthPrincipal principal) {
        return cartService.get(principal.user());
    }

    @GetMapping("/count")
    CountResponse count(@AuthenticationPrincipal AuthPrincipal principal) {
        return new CountResponse(cartService.count(principal.user()));
    }

    @PostMapping("/items")
    CartResponse add(@AuthenticationPrincipal AuthPrincipal principal, @Valid @RequestBody AddRequest req) {
        return cartService.add(principal.user(), req.productId(), req.quantity());
    }

    @PatchMapping("/items/{productId}")
    CartResponse setQuantity(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long productId,
            @Valid @RequestBody QuantityRequest req) {
        return cartService.setQuantity(principal.user(), productId, req.quantity());
    }

    @DeleteMapping("/items/{productId}")
    CartResponse remove(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long productId) {
        return cartService.remove(principal.user(), productId);
    }

    /** Không truyền productIds = xoá cả giỏ. */
    @DeleteMapping
    CartResponse removeMany(@AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false) List<Long> productIds) {
        return cartService.removeMany(principal.user(), productIds);
    }
}
