package com.example.babything_api.modules.notifications.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import com.example.babything_api.core.security.AuthPrincipal;
import com.example.babything_api.modules.notifications.dto.NotificationFeed;
import com.example.babything_api.modules.notifications.dto.PreferenceRequest;
import com.example.babything_api.modules.notifications.service.NotificationService;

/** Mọi thao tác chỉ trên thông báo của chính người đang đăng nhập. */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    NotificationFeed list(@AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.list(principal.user().getId(), unreadOnly, page, size);
    }

    @PostMapping("/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void markRead(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        service.markRead(principal.user().getId(), id);
    }

    @PostMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void markAllRead(@AuthenticationPrincipal AuthPrincipal principal) {
        service.markAllRead(principal.user().getId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        service.delete(principal.user().getId(), id);
    }

    @GetMapping("/preferences")
    Map<String, Boolean> preferences(@AuthenticationPrincipal AuthPrincipal principal) {
        return service.preferences(principal.user().getId());
    }

    @PutMapping("/preferences/{group}")
    Map<String, Boolean> setPreference(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable String group,
            @Valid @RequestBody PreferenceRequest req) {
        return service.setPreference(principal.user().getId(), group, req.enabled());
    }
}
