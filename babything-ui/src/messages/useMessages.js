import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiUpload } from '../api/client';
import { MESSAGES_EVENT, pollWhileOffline } from '../realtime/events';

/** Từ khoá gợi ý giao dịch ngoài sàn (FR-MSG-05): số điện thoại, số tài khoản, link Zalo/Facebook. */
const OFF_PLATFORM = [/(\+84|0)[\s.-]?\d{2,3}[\s.-]?\d{3}[\s.-]?\d{3,4}/, /\b\d{9,19}\b/, /zalo|facebook|fb\.com|messenger|t\.me/i];
export const hasOffPlatformContact = (text) => OFF_PLATFORM.some((re) => re.test(text));

export const MAX_TEXT = 1000;
export const MAX_IMAGES = 5;

const LIST_POLL_MS = 10000;
const THREAD_POLL_MS = 4000;
const BADGE_POLL_MS = 15000;

/** Thao tác ở đâu (trang tin nhắn, header) cũng báo cho các nơi khác trong tab tải lại danh sách / số chưa đọc. */
const broadcast = () => window.dispatchEvent(new Event(MESSAGES_EVENT));

/** Tải ngay, tải lại khi server báo có thay đổi (realtime); mất kết nối realtime thì hỏi định kỳ. */
function useRefresh(load, intervalMs, deps) {
  useEffect(() => {
    load();
    window.addEventListener(MESSAGES_EVENT, load);
    const stopPolling = pollWhileOffline(load, intervalMs);
    return () => {
      window.removeEventListener(MESSAGES_EVENT, load);
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Danh sách hội thoại của người dùng (FR-MSG-01). */
export function useMessages(userId) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api('/conversations')
      .then(setConversations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useRefresh(load, LIST_POLL_MS, [userId, load]);

  const setBlocked = useCallback(async (id, blocked) => {
    await api(`/conversations/${id}/block`, { method: 'PUT', body: { blocked } });
    broadcast();
  }, []);
  const report = useCallback((id) => api(`/conversations/${id}/report`, { method: 'POST', body: {} }), []);

  const unread = conversations.reduce((sum, c) => sum + c.unread, 0);
  return { conversations, unread, loading, setBlocked, report };
}

/** Chỉ số tin chưa đọc cho huy hiệu trên header; nhẹ hơn tải cả danh sách. */
export function useUnreadMessages(userId) {
  const [unread, setUnread] = useState(0);
  const load = useCallback(() => {
    api('/conversations/unread-count')
      .then((r) => setUnread(r.unread))
      .catch(() => {});
  }, []);
  useRefresh(load, BADGE_POLL_MS, [userId, load]);
  return unread;
}

/** Một hội thoại kèm tin nhắn; tự đánh dấu đã đọc khi có tin mới từ người kia. */
export function useThread(id) {
  const [conversation, setConversation] = useState(null);
  const [error, setError] = useState('');
  const seen = useRef(null);

  const load = useCallback(() => {
    api(`/conversations/${id}`)
      .then((c) => {
        setConversation(c);
        setError('');
        // Chỉ gọi /read khi thực sự có tin chưa đọc, tránh phát sự kiện làm mới liên tục
        if (c.unread > 0 && seen.current !== `${id}:${c.lastMessage?.id}`) {
          seen.current = `${id}:${c.lastMessage?.id}`;
          api(`/conversations/${id}/read`, { method: 'POST' }).then(broadcast, () => {});
        }
      })
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    setConversation(null);
    setError('');
    seen.current = null;
  }, [id]);
  useRefresh(load, THREAD_POLL_MS, [id, load]);

  /** images: mảng File. Ném lỗi để giao diện hiển thị (vd. bị chặn, ảnh quá lớn). */
  const send = useCallback(
    async (text, images = []) => {
      const form = new FormData();
      if (text) form.append('text', text);
      images.forEach((file) => form.append('files', file));
      await apiUpload(`/conversations/${id}/messages`, form);
      load();
      broadcast();
    },
    [id, load],
  );

  return { conversation, error, send };
}

/** Từ sản phẩm hoặc hồ sơ người bán: mở hội thoại với đúng người bán rồi chuyển tới hộp thư (FR-MSG-01). */
export function useContactSeller() {
  const navigate = useNavigate();
  return useCallback(
    async ({ productId, sellerId }) => {
      const conversation = await api('/conversations', { method: 'POST', body: { productId, sellerId } });
      broadcast();
      navigate(`/messages/${conversation.id}`);
    },
    [navigate],
  );
}
