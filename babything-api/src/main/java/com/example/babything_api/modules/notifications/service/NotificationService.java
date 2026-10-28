package com.example.babything_api.modules.notifications.service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.babything_api.core.exceptions.ApiException;
import com.example.babything_api.infrastructure.realtime.RealtimeService;
import com.example.babything_api.modules.notifications.dto.NotificationFeed;
import com.example.babything_api.modules.notifications.dto.NotificationResponse;
import com.example.babything_api.modules.notifications.entity.Notification;
import com.example.babything_api.modules.notifications.entity.NotificationPreference;
import com.example.babything_api.modules.notifications.repository.NotificationPreferenceRepository;
import com.example.babything_api.modules.notifications.repository.NotificationRepository;

/**
 * Thông báo trong app (FR-NOTI-01). Nhóm bắt buộc (tin đăng, đơn hàng, khiếu nại, chi trả, bảo mật) luôn gửi;
 * các nhóm còn lại bỏ qua nếu người dùng đã tắt (FR-NOTI-04/05).
 */
@Service
public class NotificationService {

    public static final String LISTING = "listing";
    public static final String ORDER = "order";
    public static final String DISPUTE = "dispute";
    public static final String PAYOUT = "payout";
    public static final String MESSAGE = "message";
    public static final String SECURITY = "security";
    public static final String REVIEW = "review";
    public static final String PROMO = "promo";
    public static final String SUGGEST = "suggest";
    public static final String FOLLOW = "follow";

    private static final Set<String> LOCKED = Set.of(LISTING, ORDER, DISPUTE, PAYOUT, SECURITY);
    private static final Set<String> OPTIONAL = Set.of(MESSAGE, REVIEW, PROMO, SUGGEST, FOLLOW);
    private static final int MAX_PAGE_SIZE = 50;

    private final NotificationRepository notifications;
    private final NotificationPreferenceRepository preferences;

    private final RealtimeService realtime;

    public NotificationService(NotificationRepository notifications, NotificationPreferenceRepository preferences,
            RealtimeService realtime) {
        this.notifications = notifications;
        this.preferences = preferences;
        this.realtime = realtime;
    }

    /**
     * Gửi một thông báo. Nếu đã có thông báo chưa đọc cùng nhóm và liên kết (vd. nhiều tin nhắn liên tiếp trong
     * một hội thoại) thì cập nhật nội dung dòng đó thay vì tạo thêm.
     */
    @Transactional
    public void notify(Long userId, String group, String title, String body, String link) {
        if (!isEnabled(userId, group)) {
            return;
        }
        Notification n = link == null ? null
                : notifications.findFirstByUserIdAndGroupAndLinkAndReadAtIsNull(userId, group, link).orElse(null);
        if (n == null) {
            n = new Notification();
            n.setUserId(userId);
            n.setGroup(group);
            n.setLink(link);
        }
        n.setTitle(truncate(title, 200));
        n.setBody(truncate(body, 500));
        n.setCreatedAt(Instant.now());
        notifications.save(n);
        realtime.publish(userId, "notification", "{}");
    }

    @Transactional(readOnly = true)
    public NotificationFeed list(Long userId, boolean unreadOnly, int page, int size) {
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE));
        Page<Notification> result = unreadOnly
                ? notifications.findByUserIdAndReadAtIsNullOrderByCreatedAtDescIdDesc(userId, pageable)
                : notifications.findByUserIdOrderByCreatedAtDescIdDesc(userId, pageable);
        return new NotificationFeed(result.getContent().stream().map(NotificationResponse::from).toList(),
                notifications.countByUserIdAndReadAtIsNull(userId), result.getNumber(), result.getTotalPages(),
                result.getTotalElements());
    }

    @Transactional
    public void markRead(Long userId, Long id) {
        Notification n = find(userId, id);
        if (n.getReadAt() == null) {
            n.setReadAt(Instant.now());
        }
    }

    @Transactional
    public void markAllRead(Long userId) {
        notifications.markAllRead(userId, Instant.now());
    }

    @Transactional
    public void delete(Long userId, Long id) {
        notifications.delete(find(userId, id));
    }

    /** Trạng thái bật/tắt của từng nhóm; nhóm bắt buộc luôn true. */
    @Transactional(readOnly = true)
    public Map<String, Boolean> preferences(Long userId) {
        Map<String, Boolean> result = new HashMap<>();
        LOCKED.forEach(g -> result.put(g, true));
        OPTIONAL.forEach(g -> result.put(g, true));
        preferences.findByUserId(userId).forEach(p -> {
            if (OPTIONAL.contains(p.getGroup())) {
                result.put(p.getGroup(), p.isEnabled());
            }
        });
        return result;
    }

    @Transactional
    public Map<String, Boolean> setPreference(Long userId, String group, boolean enabled) {
        if (LOCKED.contains(group)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "NOTIFICATION_LOCKED",
                    "Nhóm thông báo này là bắt buộc, không thể tắt");
        }
        if (!OPTIONAL.contains(group)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOTIFICATION_GROUP_NOT_FOUND", "Không có nhóm thông báo này");
        }
        NotificationPreference pref = preferences.findById(new NotificationPreference.Key(userId, group))
                .orElseGet(() -> new NotificationPreference(userId, group, enabled));
        pref.setEnabled(enabled);
        preferences.save(pref);
        return preferences(userId);
    }

    private boolean isEnabled(Long userId, String group) {
        if (LOCKED.contains(group)) {
            return true;
        }
        return preferences.findById(new NotificationPreference.Key(userId, group))
                .map(NotificationPreference::isEnabled).orElse(true);
    }

    private Notification find(Long userId, Long id) {
        return notifications.findByIdAndUserId(id, userId).orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "NOTIFICATION_NOT_FOUND", "Không tìm thấy thông báo"));
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return null;
        }
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }
}
