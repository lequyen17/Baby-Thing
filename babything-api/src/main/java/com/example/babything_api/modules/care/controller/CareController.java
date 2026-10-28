package com.example.babything_api.modules.care.controller;

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
import com.example.babything_api.modules.care.dto.CareDtos.BatchResponse;
import com.example.babything_api.modules.care.dto.CareDtos.CreateRequest;
import com.example.babything_api.modules.care.dto.CareDtos.ReasonRequest;
import com.example.babything_api.modules.care.dto.CareDtos.Rules;
import com.example.babything_api.modules.care.entity.CareBatchStatus;
import com.example.babything_api.modules.care.service.CareService;

/** Lô ký gửi Care của người đang đăng nhập (admin xem được mọi lô theo id). */
@RestController
@RequestMapping("/api/care")
public class CareController {

    private final CareService careService;

    public CareController(CareService careService) {
        this.careService = careService;
    }

    @GetMapping("/rules")
    Rules rules() {
        return careService.rules();
    }

    @GetMapping("/batches")
    PageResponse<BatchResponse> list(@AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false) CareBatchStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return careService.list(principal.user(), false, status, null, page, size);
    }

    @GetMapping("/batches/{id}")
    BatchResponse get(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        return careService.get(principal.user(), id);
    }

    @PostMapping("/batches")
    @ResponseStatus(HttpStatus.CREATED)
    BatchResponse create(@AuthenticationPrincipal AuthPrincipal principal, @Valid @RequestBody CreateRequest req) {
        return careService.create(principal.user(), req);
    }

    @PostMapping("/batches/{id}/agree")
    BatchResponse agree(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        return careService.agree(principal.user(), id);
    }

    @PostMapping("/batches/{id}/cancel")
    BatchResponse cancel(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        return careService.cancel(principal.user(), id);
    }

    /** Duyệt báo giá chính thức và thanh toán phí vệ sinh (cổng giả lập). */
    @PostMapping("/batches/{id}/accept-quote")
    BatchResponse acceptQuote(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        return careService.acceptQuote(principal.user(), id);
    }

    @PostMapping("/batches/{id}/reject-quote")
    BatchResponse rejectQuote(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
            @Valid @RequestBody(required = false) ReasonRequest req) {
        return careService.rejectQuote(principal.user(), id, req == null ? null : req.reason());
    }

    @PostMapping("/batches/{id}/extend")
    BatchResponse extend(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        return careService.extend(principal.user(), id);
    }

    @PostMapping("/batches/{id}/end")
    BatchResponse end(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        return careService.end(principal.user(), id);
    }
}
