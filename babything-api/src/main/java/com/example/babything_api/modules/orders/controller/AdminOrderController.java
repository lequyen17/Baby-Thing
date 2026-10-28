package com.example.babything_api.modules.orders.controller;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.babything_api.core.dto.PageResponse;
import com.example.babything_api.core.security.AuthPrincipal;
import com.example.babything_api.modules.orders.dto.OrderResponse;
import com.example.babything_api.modules.orders.entity.OrderStatus;
import com.example.babything_api.modules.orders.service.OrderService;

/**
 * Trang quản trị đơn: mọi đơn trên sàn với thêm bộ lọc người bán / khoảng ngày / đơn cần chú ý.
 * Thao tác trên đơn vẫn dùng /api/orders/{id}/... (admin làm được mọi việc). /api/admin/** chỉ cho ADMIN.
 */
@RestController
@RequestMapping("/api/admin/orders")
public class AdminOrderController {

    private final OrderService orderService;

    public AdminOrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    PageResponse<OrderResponse> list(@AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) String seller,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String attention,
            @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return orderService.list(principal.user(),
                new OrderService.ListQuery(null, q, status, sort, page, size, seller, from, to, attention));
    }

    @GetMapping("/stats")
    OrderService.AdminStats stats(@AuthenticationPrincipal AuthPrincipal principal) {
        return orderService.adminStats(principal.user());
    }
}
