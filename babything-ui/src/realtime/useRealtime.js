import { useEffect } from 'react';
import { api, tokenStore } from '../api/client';
import { MESSAGES_EVENT, NOTIFICATIONS_EVENT, setRealtimeConnected } from './events';

const EVENT_TARGETS = {
  message: [MESSAGES_EVENT],
  notification: [NOTIFICATIONS_EVENT],
  // Vừa (kết nối lại) xong: tải lại tất cả để bắt kịp những gì xảy ra lúc mất kết nối
  ready: [MESSAGES_EVENT, NOTIFICATIONS_EVENT],
};

const dispatch = (name) => EVENT_TARGETS[name]?.forEach((e) => window.dispatchEvent(new Event(e)));

/** Đọc luồng text/event-stream; trả về khi server đóng kết nối. */
async function readStream(body, onEvent) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });
    let end;
    while ((end = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const name = block.split('\n').find((l) => l.startsWith('event:'))?.slice(6).trim();
      if (name) onEvent(name);
    }
  }
}

const sleep = (ms, signal) =>
  new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      resolve();
    });
  });

/**
 * Một kết nối giữ mở cho cả ứng dụng: server đẩy "có tin nhắn / thông báo mới", client mới tải lại dữ liệu.
 * Dùng fetch thay vì EventSource vì EventSource không gửi được header Authorization (access token nằm trong RAM).
 * Mất kết nối thì thử lại với thời gian chờ tăng dần; trong lúc đó các hook tự quay về hỏi định kỳ.
 */
export function useRealtime(userId) {
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      let delay = 1000;
      while (!signal.aborted) {
        try {
          const res = await fetch('/api/realtime/stream', {
            headers: { Accept: 'text/event-stream', Authorization: `Bearer ${tokenStore.access}` },
            credentials: 'include',
            signal,
          });
          if (res.status === 401) {
            // Access token hết hạn: gọi một API thường để client tự refresh token rồi kết nối lại
            await api('/users/me').catch(() => {});
          } else if (res.ok && res.body) {
            setRealtimeConnected(true);
            delay = 1000;
            await readStream(res.body, dispatch);
          }
        } catch {
          // Mất mạng hoặc bị huỷ: rơi xuống bước chờ rồi thử lại
        }
        setRealtimeConnected(false);
        if (signal.aborted) break;
        await sleep(delay, signal);
        delay = Math.min(delay * 2, 30000);
      }
    })();

    return () => {
      controller.abort();
      setRealtimeConnected(false);
    };
  }, [userId]);
}
