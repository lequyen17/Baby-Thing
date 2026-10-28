package com.example.babything_api.infrastructure.realtime;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import jakarta.annotation.PreDestroy;

/**
 * Đẩy sự kiện tới trình duyệt qua Server-Sent Events: server chỉ báo "có gì mới" ({@code message}, {@code notification}),
 * client tự tải lại dữ liệu bằng API thường nên quyền truy cập vẫn kiểm tra ở một chỗ.
 * Mỗi người dùng có thể mở nhiều kết nối (nhiều tab). Trạng thái kết nối nằm trong bộ nhớ của instance này,
 * nên khi chạy nhiều instance api cần chuyển sự kiện qua Redis pub/sub (Redis đã có sẵn).
 */
@Service
public class RealtimeService {

    private static final Logger log = LoggerFactory.getLogger(RealtimeService.class);

    /** Tối đa số tab mở cùng lúc cho mỗi người; vượt thì đóng kết nối cũ nhất. */
    private static final int MAX_PER_USER = 5;
    /** Nginx mặc định ngắt kết nối im lặng sau 60 giây, nên gửi một dòng chú thích định kỳ. */
    private static final long HEARTBEAT_SECONDS = 25;

    private final Map<Long, Set<SseEmitter>> emitters = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "realtime-heartbeat");
        t.setDaemon(true);
        return t;
    });

    public RealtimeService() {
        scheduler.scheduleWithFixedDelay(this::heartbeat, HEARTBEAT_SECONDS, HEARTBEAT_SECONDS, TimeUnit.SECONDS);
    }

    public SseEmitter subscribe(Long userId) {
        SseEmitter emitter = new SseEmitter(0L);
        Set<SseEmitter> mine = emitters.computeIfAbsent(userId, k -> new CopyOnWriteArraySet<>());
        mine.add(emitter);
        Runnable remove = () -> remove(userId, emitter);
        emitter.onCompletion(remove);
        emitter.onTimeout(remove);
        emitter.onError(e -> remove.run());
        while (mine.size() > MAX_PER_USER) {
            SseEmitter oldest = mine.iterator().next();
            mine.remove(oldest);
            oldest.complete();
        }
        // Client dùng "ready" để tải lại dữ liệu, bắt kịp những gì xảy ra lúc mất kết nối
        send(userId, emitter, "ready", "{}");
        return emitter;
    }

    /** Gửi sau khi transaction đang chạy commit xong, để client tải lại là thấy dữ liệu mới. */
    public void publish(Long userId, String event, String jsonData) {
        if (userId == null) {
            return;
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    deliver(userId, event, jsonData);
                }
            });
        } else {
            deliver(userId, event, jsonData);
        }
    }

    private void deliver(Long userId, String event, String jsonData) {
        Set<SseEmitter> mine = emitters.get(userId);
        if (mine != null) {
            mine.forEach(e -> send(userId, e, event, jsonData));
        }
    }

    private void send(Long userId, SseEmitter emitter, String event, String jsonData) {
        try {
            emitter.send(SseEmitter.event().name(event).data(jsonData));
        } catch (IOException | IllegalStateException e) {
            remove(userId, emitter);
        }
    }

    private void heartbeat() {
        emitters.forEach((userId, mine) -> mine.forEach(e -> {
            try {
                e.send(SseEmitter.event().comment("ping"));
            } catch (IOException | IllegalStateException ex) {
                remove(userId, e);
            }
        }));
    }

    private void remove(Long userId, SseEmitter emitter) {
        emitters.computeIfPresent(userId, (k, set) -> {
            set.remove(emitter);
            return set.isEmpty() ? null : set;
        });
    }

    @PreDestroy
    void shutdown() {
        scheduler.shutdownNow();
        emitters.values().forEach(set -> set.forEach(e -> {
            try {
                e.complete();
            } catch (RuntimeException ex) {
                log.debug("Closing SSE emitter failed", ex);
            }
        }));
    }
}
