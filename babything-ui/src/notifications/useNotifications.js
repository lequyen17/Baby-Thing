import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { NOTIFICATIONS_EVENT, pollWhileOffline } from '../realtime/events';

/**
 * Nhóm thông báo (FR-NOTI-04/05): nhóm `locked` luôn bật, các nhóm còn lại người dùng tự bật/tắt.
 * email: nhóm được gửi kèm email (FR-NOTI-02; SMS chỉ dùng cho OTP). Danh sách nhóm khớp NotificationService ở backend.
 */
export const GROUPS = [
  { id: 'listing', label: 'Tin đăng', desc: 'Tin được duyệt, bị từ chối hoặc cần chỉnh sửa.', locked: true, email: true },
  { id: 'order', label: 'Đơn hàng & thanh toán', desc: 'Đơn mới, thanh toán, giao hàng, nhắc xác nhận nhận hàng.', locked: true, email: true },
  { id: 'dispute', label: 'Khiếu nại', desc: 'Khiếu nại mới, phản hồi và kết luận.', locked: true, email: true },
  { id: 'payout', label: 'Chi trả', desc: 'Tiền bán hàng đã được chuyển vào tài khoản.', locked: true, email: true },
  { id: 'message', label: 'Tin nhắn', desc: 'Có tin nhắn mới từ người mua hoặc người bán.', locked: false, email: false },
  { id: 'security', label: 'Bảo mật tài khoản', desc: 'Cảnh báo đăng nhập lạ, khoá tài khoản.', locked: true, email: true },
  { id: 'review', label: 'Đánh giá', desc: 'Lời mời đánh giá sau giao dịch.', locked: false, email: false },
  { id: 'promo', label: 'Khuyến mãi', desc: 'Voucher, ưu đãi và chương trình của Baby Things.', locked: false, email: false },
  { id: 'suggest', label: 'Gợi ý sản phẩm', desc: 'Sản phẩm phù hợp với độ tuổi của bé. Chỉ gửi khi bạn đồng ý.', locked: false, email: false },
  { id: 'follow', label: 'Người bán đang theo dõi', desc: 'Tin mới từ người bán bạn theo dõi.', locked: false, email: false },
];

export const groupOf = (id) => GROUPS.find((g) => g.id === id);

const POLL_MS = 30000;

/** Cùng lúc có nhiều nơi dùng hook (chuông, trang thông báo): thao tác ở đâu cũng báo cho các nơi khác tải lại. */
const broadcast = () => window.dispatchEvent(new Event(NOTIFICATIONS_EVENT));

/** Danh sách thông báo của người dùng + thao tác đánh dấu đã đọc (FR-NOTI-01). Cập nhật tức thì nhờ kết nối realtime; chỉ hỏi định kỳ khi kết nối đó đứt. */
export function useNotifications(userId) {
  const [feed, setFeed] = useState({ items: [], unread: 0 });
  const [prefs, setPrefs] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api('/notifications?size=50')
      .then(setFeed)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    api('/notifications/preferences').then(setPrefs).catch(() => {});
    window.addEventListener(NOTIFICATIONS_EVENT, load);
    const stopPolling = pollWhileOffline(load, POLL_MS);
    return () => {
      window.removeEventListener(NOTIFICATIONS_EVENT, load);
      stopPolling();
    };
  }, [userId, load]);

  // Cập nhật giao diện ngay rồi gọi API; xong (kể cả lỗi) thì tải lại để khớp trạng thái trên server
  const mutate = useCallback((optimistic, request) => {
    setFeed(optimistic);
    request().then(broadcast, broadcast);
  }, []);

  const markRead = useCallback(
    (id) =>
      mutate(
        (f) => {
          const target = f.items.find((n) => n.id === id);
          return target && !target.read
            ? { ...f, unread: Math.max(0, f.unread - 1), items: f.items.map((n) => (n.id === id ? { ...n, read: true } : n)) }
            : f;
        },
        () => api(`/notifications/${id}/read`, { method: 'POST' }),
      ),
    [mutate],
  );

  const markAllRead = useCallback(
    () =>
      mutate(
        (f) => ({ ...f, unread: 0, items: f.items.map((n) => ({ ...n, read: true })) }),
        () => api('/notifications/read-all', { method: 'POST' }),
      ),
    [mutate],
  );

  const remove = useCallback(
    (id) =>
      mutate(
        (f) => {
          const target = f.items.find((n) => n.id === id);
          return { ...f, unread: target && !target.read ? Math.max(0, f.unread - 1) : f.unread, items: f.items.filter((n) => n.id !== id) };
        },
        () => api(`/notifications/${id}`, { method: 'DELETE' }),
      ),
    [mutate],
  );

  const setPref = useCallback((id, on) => {
    setPrefs((p) => ({ ...p, [id]: on }));
    api(`/notifications/preferences/${id}`, { method: 'PUT', body: { enabled: on } })
      .then(setPrefs)
      .catch(() => api('/notifications/preferences').then(setPrefs).catch(() => {}));
  }, []);

  const enabled = (id) => (groupOf(id)?.locked ? true : prefs[id] !== false);
  const items = feed.items.map((n) => ({ ...n, to: n.link || '/notifications' }));

  return { items, unread: feed.unread, loading, enabled, markRead, markAllRead, remove, setPref };
}
