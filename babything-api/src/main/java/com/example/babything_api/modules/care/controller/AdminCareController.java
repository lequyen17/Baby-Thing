package com.example.babything_api.modules.care.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import com.example.babything_api.core.dto.PageResponse;
import com.example.babything_api.core.security.AuthPrincipal;
import com.example.babything_api.modules.care.dto.CareDtos.BatchResponse;
import com.example.babything_api.modules.care.dto.CareDtos.CleanRequest;
import com.example.babything_api.modules.care.dto.CareDtos.ListRequest;
import com.example.babything_api.modules.care.dto.CareDtos.QuoteRequest;
import com.example.babything_api.modules.care.dto.CareDtos.ReasonRequest;
import com.example.babything_api.modules.care.dto.CareDtos.ReceiveRequest;
import com.example.babything_api.modules.care.dto.CareDtos.RepriceRequest;
import com.example.babything_api.modules.care.dto.CareDtos.ScreenRequest;
import com.example.babything_api.modules.care.dto.CareDtos.Stats;
import com.example.babything_api.modules.care.entity.CareBatchStatus;
import com.example.babything_api.modules.care.service.CareService;

/** Quản lý kho Care (chỉ ADMIN, xem SecurityConfig). */
@RestController
@RequestMapping("/api/admin/care")
public class AdminCareController {

    private final CareService careService;

    public AdminCareController(CareService careService) {
        this.careService = careService;
    }

    @GetMapping("/batches")
    PageResponse<BatchResponse> list(@AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false) CareBatchStatus status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return careService.list(principal.user(), true, status, q, page, size);
    }

    @GetMapping("/stats")
    Stats stats(@AuthenticationPrincipal AuthPrincipal principal) {
        return careService.stats(principal.user());
    }

    @PostMapping("/batches/{id}/screen")
    BatchResponse screen(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
            @Valid @RequestBody ScreenRequest req) {
        return careService.screen(principal.user(), id, req);
    }

    @PostMapping("/batches/{id}/receive")
    BatchResponse receive(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
            @Valid @RequestBody ReceiveRequest req) {
        return careService.receive(principal.user(), id, req);
    }

    @PostMapping("/batches/{id}/quote")
    BatchResponse quote(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
            @Valid @RequestBody QuoteRequest req) {
        return careService.quote(principal.user(), id, req);
    }

    @PostMapping("/batches/{id}/cleaned")
    BatchResponse cleaned(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
            @Valid @RequestBody CleanRequest req) {
        return careService.clean(principal.user(), id, req);
    }

    @PostMapping("/batches/{id}/reprice")
    BatchResponse reprice(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
            @Valid @RequestBody RepriceRequest req) {
        return careService.reprice(principal.user(), id, req);
    }

    @PostMapping("/batches/{id}/publish")
    BatchResponse publish(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
            @Valid @RequestBody ListRequest req) {
        return careService.publish(principal.user(), id, req);
    }

    @PostMapping("/batches/{id}/return-all")
    BatchResponse returnAll(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
            @Valid @RequestBody ReasonRequest req) {
        return careService.returnAll(principal.user(), id, req.reason());
    }

    @PostMapping("/batches/{id}/returned")
    BatchResponse returned(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        return careService.markReturned(principal.user(), id);
    }
}
