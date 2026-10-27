import { useCallback } from 'react';
import { newId, useUserStore } from '../api/localStore';

/**
 * Nhóm thông báo (FR-NOTI-04/05): nhóm `locked` luôn bật, các nhóm còn lại người dùng tự bật/tắt.
 * channels: kênh gửi ngoài web (FR-NOTI-02: email cho sự kiện quan trọng; SMS chỉ dùng cho OTP).
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

const ago = (minutes) => new Date(Date.now() - minutes * 60000).toISOString();

const SEED = [
  { id: 'n1', group: 'listing', title: 'Tin đăng đã được duyệt', body: 'Bộ body cotton 3–6 tháng của bạn đã hiển thị trên trang chủ.', to: '/products', at: ago(12), read: false },
  { id: 'n2', group: 'message', title: 'Mai Anh đã nhắn cho bạn', body: '“Bạn ơi chiếc xe đẩy còn không ạ, mình ở Cầu Giấy.”', to: '/messages', at: ago(45), read: false },
  { id: 'n3', group: 'order', title: 'Đơn #BT2410-0187 sắp quá hạn xác nhận', body: 'Hãy xác nhận đơn trong 3 giờ tới để không bị tự huỷ.', to: '/orders', at: ago(190), read: false },
  { id: 'n4', group: 'payout', title: 'Đã chuyển tiền đợt tuần này', body: '1.240.000đ đã được chuyển vào tài khoản nhận tiền của bạn.', to: '/profile/payout', at: ago(60 * 26), read: true },
  { id: 'n5', group: 'promo', title: 'Voucher đơn đầu: giảm 30.000đ phí ship', body: 'Áp dụng cho đơn đầu tiên đến hết tháng này.', to: '/products', at: ago(60 * 50), read: true },
  { id: 'n6', group: 'security', title: 'Đăng nhập từ thiết bị mới', body: 'Nếu không phải bạn, hãy đổi mật khẩu ngay.', to: '/settings', at: ago(60 * 24 * 5), read: true },
];

/** Danh sách thông báo của người dùng + thao tác đánh dấu đã đọc (FR-NOTI-01). */
export function useNotifications(userId) {
  const [items, setItems] = useUserStore(userId, 'notifications', SEED);
  const [prefs, setPrefs] = useUserStore(userId, 'notification-prefs', {});

  const enabled = (id) => (groupOf(id)?.locked ? true : prefs[id] !== false);
  const visible = items.filter((n) => enabled(n.group));
  const unread = visible.filter((n) => !n.read).length;

  const markRead = useCallback((id) => setItems((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n))), [setItems]);
  const markAllRead = useCallback(() => setItems((list) => list.map((n) => ({ ...n, read: true }))), [setItems]);
  const remove = useCallback((id) => setItems((list) => list.filter((n) => n.id !== id)), [setItems]);
  const push = useCallback(
    (n) => setItems((list) => [{ id: newId(), at: new Date().toISOString(), read: false, ...n }, ...list]),
    [setItems],
  );
  const setPref = useCallback((id, on) => setPrefs((p) => ({ ...p, [id]: on })), [setPrefs]);

  return { items: visible, unread, prefs, enabled, markRead, markAllRead, remove, push, setPref };
}
