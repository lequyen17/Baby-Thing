package com.example.babything_api.modules.messages.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;

import com.example.babything_api.core.security.AuthPrincipal;
import com.example.babything_api.modules.messages.dto.ConversationDtos.BlockRequest;
import com.example.babything_api.modules.messages.dto.ConversationDtos.ConversationResponse;
import com.example.babything_api.modules.messages.dto.ConversationDtos.MessageResponse;
import com.example.babything_api.modules.messages.dto.ConversationDtos.OpenRequest;
import com.example.babything_api.modules.messages.dto.ConversationDtos.ReportRequest;
import com.example.babything_api.modules.messages.dto.ConversationDtos.UnreadCount;
import com.example.babything_api.modules.messages.service.MessageService;

/** Quyền truy cập (chỉ hai người trong hội thoại) kiểm tra trong MessageService. */
@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    private final MessageService service;

    public ConversationController(MessageService service) {
        this.service = service;
    }

    @GetMapping
    List<ConversationResponse> list(@AuthenticationPrincipal AuthPrincipal principal) {
        return service.list(principal.user());
    }

    @GetMapping("/unread-count")
    UnreadCount unreadCount(@AuthenticationPrincipal AuthPrincipal principal) {
        return new UnreadCount(service.unreadTotal(principal.user()));
    }

    /** Mở hội thoại với người bán của một sản phẩm; đã có thì trả lại hội thoại cũ. */
    @PostMapping
    ConversationResponse open(@AuthenticationPrincipal AuthPrincipal principal, @RequestBody OpenRequest req) {
        return service.open(principal.user(), req.productId(), req.sellerId());
    }

    @GetMapping("/{id}")
    ConversationResponse get(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        return service.get(principal.user(), id);
    }

    @PostMapping("/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void markRead(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        service.markRead(principal.user(), id);
    }

    @PostMapping(value = "/{id}/messages", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    MessageResponse send(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
            @RequestParam(required = false) String text,
            @RequestParam(name = "files", required = false) List<MultipartFile> files) {
        return service.send(principal.user(), id, text, files);
    }

    @PutMapping("/{id}/block")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void block(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
            @Valid @RequestBody BlockRequest req) {
        service.setBlocked(principal.user(), id, req.blocked());
    }

    @PostMapping("/{id}/report")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void report(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
            @Valid @RequestBody(required = false) ReportRequest req) {
        service.report(principal.user(), id, req == null ? null : req.reason());
    }
}
