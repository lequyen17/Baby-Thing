package com.example.babything_api.modules.payments.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.babything_api.core.dto.PageResponse;
import com.example.babything_api.core.security.AuthPrincipal;
import com.example.babything_api.modules.payments.dto.PaymentResponse;
import com.example.babything_api.modules.payments.dto.PaymentSummary;
import com.example.babything_api.modules.payments.entity.PaymentMethod;
import com.example.babything_api.modules.payments.entity.PaymentStatus;
import com.example.babything_api.modules.payments.service.PaymentService;

/** Mọi giao dịch trên sàn, để admin đối soát. /api/admin/** chỉ cho ADMIN (SecurityConfig). */
@RestController
@RequestMapping("/api/admin/payments")
public class AdminPaymentController {

    private final PaymentService paymentService;

    public AdminPaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping
    PageResponse<PaymentResponse> list(@AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) PaymentStatus status,
            @RequestParam(required = false) PaymentMethod method,
            @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return paymentService.listAll(principal.user(), new PaymentService.ListQuery(q, status, method, sort, page, size));
    }

    @GetMapping("/summary")
    PaymentSummary summary(@AuthenticationPrincipal AuthPrincipal principal) {
        return paymentService.summaryAll(principal.user());
    }
}
