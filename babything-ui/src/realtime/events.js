/** Tên sự kiện nội bộ trên window: kết nối realtime phát, các hook (tin nhắn, thông báo) lắng nghe và tải lại. */
export const MESSAGES_EVENT = 'babything:messages';
export const NOTIFICATIONS_EVENT = 'babything:notifications';

let connected = false;
export const isRealtimeConnected = () => connected;
export const setRealtimeConnected = (value) => {
  connected = value;
};

/**
 * Hook nào cũng dùng chung: tải ngay, tải lại khi có sự kiện, và chỉ hỏi định kỳ khi kết nối realtime đang đứt
 * (hoặc chưa mở) và tab đang hiển thị. Đang có realtime thì không gửi request thừa.
 */
export function pollWhileOffline(load, intervalMs) {
  const tick = () => {
    if (!document.hidden && !connected) load();
  };
  const timer = setInterval(tick, intervalMs);
  window.addEventListener('focus', tick);
  return () => {
    clearInterval(timer);
    window.removeEventListener('focus', tick);
  };
}
