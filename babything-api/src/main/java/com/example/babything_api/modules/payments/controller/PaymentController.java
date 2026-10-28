package com.example.babything_api.modules.payments.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import com.example.babything_api.core.dto.PageResponse;
import com.example.babything_api.core.security.AuthPrincipal;
import com.example.babything_api.modules.payments.dto.CheckoutRequest;
import com.example.babything_api.modules.payments.dto.CheckoutResponse;
import com.example.babything_api.modules.payments.dto.MockResultRequest;
import com.example.babything_api.modules.payments.dto.PaymentResponse;
import com.example.babything_api.modules.payments.dto.PaymentSummary;
import com.example.babything_api.modules.payments.entity.PaymentMethod;
import com.example.babything_api.modules.payments.entity.PaymentStatus;
import com.example.babything_api.modules.payments.service.PaymentService;

/** Thanh toán của người đang đăng nhập. Quyền xem chi tiết kiểm tra trong PaymentService. */
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping
    PageResponse<PaymentResponse> listMine(@AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) PaymentStatus status,
            @RequestParam(required = false) PaymentMethod method,
            @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return paymentService.listMine(principal.user(), new PaymentService.ListQuery(q, status, method, sort, page, size));
    }

    @GetMapping("/summary")
    PaymentSummary summary(@AuthenticationPrincipal AuthPrincipal principal) {
        return paymentService.summary(principal.user());
    }

    @GetMapping("/{id}")
    PaymentResponse get(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        return paymentService.get(principal.user(), id);
    }

    /** Người mua bắt đầu thanh toán một đơn; chuyển trình duyệt sang checkoutUrl. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    CheckoutResponse checkout(@AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody CheckoutRequest req) {
        return paymentService.checkout(principal.user(), req.orderId(), req.method());
    }

    // ---------------------------------------------------------------- Cổng giả lập (trang /pay/{ref} của frontend)

    @GetMapping("/mock-gateway/{ref}")
    PaymentResponse mockGateway(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable String ref) {
        return paymentService.getByRef(principal.user(), ref);
    }

    @PostMapping("/mock-gateway/{ref}")
    PaymentResponse mockGatewayResult(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable String ref,
            @Valid @RequestBody MockResultRequest req) {
        return paymentService.completeMock(principal.user(), ref, req.success());
    }
}
