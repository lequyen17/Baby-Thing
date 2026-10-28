package com.example.babything_api.modules.orders.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import com.example.babything_api.core.dto.PageResponse;
import com.example.babything_api.core.security.AuthPrincipal;
import com.example.babything_api.modules.orders.dto.CancelOrderRequest;
import com.example.babything_api.modules.orders.dto.OrderRequest;
import com.example.babything_api.modules.orders.dto.OrderResponse;
import com.example.babything_api.modules.orders.dto.OrderStatusRequest;
import com.example.babything_api.modules.orders.entity.OrderStatus;
import com.example.babything_api.modules.orders.service.OrderService;

/** Quyền người mua / người bán / admin kiểm tra trong OrderService. */
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    PageResponse<OrderResponse> list(@AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false) String view,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return orderService.list(principal.user(), new OrderService.ListQuery(view, q, status, sort, page, size));
    }

    @GetMapping("/{id}")
    OrderResponse get(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        return orderService.get(principal.user(), id);
    }

    /** Trả về danh sách: hàng của nhiều người bán được tách thành một đơn cho mỗi người bán. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    List<OrderResponse> create(@AuthenticationPrincipal AuthPrincipal principal, @Valid @RequestBody OrderRequest req) {
        return orderService.create(principal.user(), req);
    }

    @PutMapping("/{id}")
    OrderResponse update(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
            @Valid @RequestBody OrderRequest req) {
        return orderService.update(principal.user(), id, req);
    }

    @PostMapping("/{id}/cancel")
    OrderResponse cancel(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
            @Valid @RequestBody(required = false) CancelOrderRequest req) {
        return orderService.cancel(principal.user(), id, req == null ? null : req.reason());
    }

    @PatchMapping("/{id}/status")
    OrderResponse updateStatus(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
            @Valid @RequestBody OrderStatusRequest req) {
        return orderService.updateStatus(principal.user(), id, req.status(), req.trackingCode());
    }

    /** Người mua xác nhận đã nhận hàng đúng mô tả. */
    @PostMapping("/{id}/receive")
    OrderResponse receive(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        return orderService.receive(principal.user(), id);
    }
}
