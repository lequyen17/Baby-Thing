import { useCallback } from 'react';
import { newId, useUserStore } from '../api/localStore';

const ago = (minutes) => new Date(Date.now() - minutes * 60000).toISOString();

/** Hội thoại mẫu để xem giao diện; backend nhắn tin (WebSocket) chưa có nên dữ liệu lưu tạm ở trình duyệt. */
const SEED = [
  {
    id: 'c1',
    peer: { id: 'demo-mai-anh', name: 'Mai Anh' },
    product: { id: null, name: 'Xe đẩy gấp gọn Aprica', price: 1350000, category: 'Xe đẩy' },
    blocked: false,
    messages: [
      { id: 'm1', from: 'peer', text: 'Chào bạn, xe đẩy còn không ạ?', at: ago(95), images: [] },
      { id: 'm2', from: 'me', text: 'Chào bạn, xe còn nhé. Mình dùng được 8 tháng, bánh và khung đều tốt.', at: ago(80), images: [] },
      { id: 'm3', from: 'peer', text: 'Bạn ơi chiếc xe đẩy còn không ạ, mình ở Cầu Giấy. Bạn chụp giúp mình phần bánh xe được không?', at: ago(45), images: [] },
    ],
    readAt: null,
  },
  {
    id: 'c2',
    peer: { id: 'demo-thu-ha', name: 'Thu Hà' },
    product: { id: null, name: 'Bộ body cotton 3–6 tháng (5 chiếc)', price: 180000, category: 'Quần áo' },
    blocked: false,
    messages: [
      { id: 'm4', from: 'me', text: 'Chị ơi bộ body này size 3–6 tháng giặt mấy lần rồi ạ?', at: ago(60 * 30), images: [] },
      { id: 'm5', from: 'peer', text: 'Mình giặt 2 lần thôi bạn, vải còn mềm, không bai xù nhé.', at: ago(60 * 29), images: [] },
    ],
    readAt: ago(60 * 28),
  },
];

/** Từ khoá gợi ý giao dịch ngoài sàn (FR-MSG-05): số điện thoại, số tài khoản, link Zalo/Facebook. */
const OFF_PLATFORM = [/(\+84|0)[\s.-]?\d{2,3}[\s.-]?\d{3}[\s.-]?\d{3,4}/, /\b\d{9,19}\b/, /zalo|facebook|fb\.com|messenger|t\.me/i];
export const hasOffPlatformContact = (text) => OFF_PLATFORM.some((re) => re.test(text));

export const MAX_TEXT = 1000;
export const MAX_IMAGES = 5;

export function useMessages(userId) {
  const [conversations, setConversations] = useUserStore(userId, 'conversations', SEED);

  const patch = useCallback(
    (id, fn) => setConversations((list) => list.map((c) => (c.id === id ? fn(c) : c))),
    [setConversations],
  );

  const send = useCallback(
    (id, text, images = []) =>
      patch(id, (c) => ({
        ...c,
        messages: [...c.messages, { id: newId(), from: 'me', text, images, at: new Date().toISOString() }],
        readAt: new Date().toISOString(),
      })),
    [patch],
  );

  const markRead = useCallback((id) => patch(id, (c) => (unreadCount(c) ? { ...c, readAt: new Date().toISOString() } : c)), [patch]);
  const setBlocked = useCallback((id, blocked) => patch(id, (c) => ({ ...c, blocked })), [patch]);

  /** Mở (hoặc tạo) hội thoại với người bán cho một sản phẩm: mỗi cặp Buyer–Seller–sản phẩm một hội thoại (FR-MSG-01). */
  const open = useCallback(
    (peer, product) => {
      const existing = conversations.find((c) => c.peer.id === peer.id && c.product?.id === product?.id);
      if (existing) return existing.id;
      const id = newId();
      setConversations((list) => [{ id, peer, product, blocked: false, messages: [], readAt: new Date().toISOString() }, ...list]);
      return id;
    },
    [conversations, setConversations],
  );

  const unread = conversations.reduce((sum, c) => sum + unreadCount(c), 0);
  return { conversations, unread, send, markRead, setBlocked, open };
}

export function unreadCount(c) {
  const readAt = c.readAt ? new Date(c.readAt).getTime() : 0;
  return c.messages.filter((m) => m.from === 'peer' && new Date(m.at).getTime() > readAt).length;
}

export const lastMessage = (c) => c.messages[c.messages.length - 1];
