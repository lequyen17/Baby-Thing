package com.example.babything_api.infrastructure.realtime;

import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.example.babything_api.core.security.AuthPrincipal;

/** Kết nối giữ mở để nhận sự kiện của chính người đăng nhập; xác thực bằng access token như các API khác. */
@RestController
@RequestMapping("/api/realtime")
public class RealtimeController {

    private final RealtimeService realtime;

    public RealtimeController(RealtimeService realtime) {
        this.realtime = realtime;
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    SseEmitter stream(@AuthenticationPrincipal AuthPrincipal principal) {
        return realtime.subscribe(principal.user().getId());
    }
}
