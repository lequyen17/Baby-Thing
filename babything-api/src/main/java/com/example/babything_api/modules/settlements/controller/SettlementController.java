package com.example.babything_api.modules.settlements.controller;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import com.example.babything_api.core.dto.PageResponse;
import com.example.babything_api.core.security.AuthPrincipal;
import com.example.babything_api.modules.settlements.dto.PayoutAccountDto;
import com.example.babything_api.modules.settlements.dto.PayoutRequest;
import com.example.babything_api.modules.settlements.dto.SettlementResponse;
import com.example.babything_api.modules.settlements.dto.SettlementSummary;
import com.example.babything_api.modules.settlements.entity.SettlementStatus;
import com.example.babything_api.modules.settlements.service.SettlementService;

/** /api/settlements: của người bán đang đăng nhập. /api/admin/settlements: toàn sàn, chỉ ADMIN (SecurityConfig). */
@RestController
public class SettlementController {

    private final SettlementService settlementService;

    public SettlementController(SettlementService settlementService) {
        this.settlementService = settlementService;
    }

    @GetMapping("/api/settlements")
    PageResponse<SettlementResponse> listMine(@AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) SettlementStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return settlementService.listMine(principal.user(),
                new SettlementService.ListQuery(q, status, null, page, size));
    }

    @GetMapping("/api/settlements/summary")
    SettlementSummary summaryMine(@AuthenticationPrincipal AuthPrincipal principal) {
        return settlementService.summaryMine(principal.user());
    }

    /** Chưa khai báo thì body rỗng (null). */
    @GetMapping("/api/payout-account")
    PayoutAccountDto getPayoutAccount(@AuthenticationPrincipal AuthPrincipal principal) {
        return settlementService.getPayoutAccount(principal.user());
    }

    @PutMapping("/api/payout-account")
    PayoutAccountDto savePayoutAccount(@AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody PayoutAccountDto req) {
        return settlementService.savePayoutAccount(principal.user(), req);
    }

    // ---------------------------------------------------------------- Admin

    @GetMapping("/api/admin/settlements")
    PageResponse<SettlementResponse> listAll(@AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) SettlementStatus status,
            @RequestParam(required = false) Long sellerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return settlementService.listAll(principal.user(),
                new SettlementService.ListQuery(q, status, sellerId, page, size));
    }

    @GetMapping("/api/admin/settlements/summary")
    SettlementSummary summaryAll(@AuthenticationPrincipal AuthPrincipal principal) {
        return settlementService.summaryAll(principal.user());
    }

    @PostMapping("/api/admin/settlements/pay")
    List<SettlementResponse> pay(@AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody PayoutRequest req) {
        return settlementService.markPaid(principal.user(), req.ids(), req.reference());
    }
}
