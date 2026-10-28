import { useCallback, useEffect, useState } from 'react';

/**
 * Lưu dữ liệu theo từng tài khoản trong localStorage.
 * Chỉ dùng tạm cho các module chưa có API (hồ sơ mở rộng, địa chỉ, tài khoản nhận tiền, tin nhắn, thông báo);
 * khi backend sẵn sàng chỉ cần thay thân hook, các trang không phải sửa.
 */
const SYNC_EVENT = 'babything:store';
const key = (userId, name) => `babything:${userId}:${name}`;

function read(userId, name, fallback) {
  try {
    const raw = localStorage.getItem(key(userId, name));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function useUserStore(userId, name, fallback) {
  const [value, setValue] = useState(() => read(userId, name, fallback));

  // Đọc lại khi đổi tài khoản hoặc khi hook khác (header, trang khác) vừa ghi cùng khoá
  useEffect(() => {
    const reload = () => setValue(read(userId, name, fallback));
    reload();
    const onChange = (e) => e.detail === key(userId, name) && reload();
    window.addEventListener(SYNC_EVENT, onChange);
    return () => window.removeEventListener(SYNC_EVENT, onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, name]);

  const update = useCallback(
    (next) => {
      const prev = read(userId, name, fallback);
      const resolved = typeof next === 'function' ? next(prev) : next;
      try {
        localStorage.setItem(key(userId, name), JSON.stringify(resolved));
      } catch {
        // Hết dung lượng hoặc bị chặn: vẫn cập nhật state trong bộ nhớ
      }
      setValue(resolved);
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: key(userId, name) }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, name],
  );

  return [value, update];
}

export const newId = () => Math.random().toString(36).slice(2, 10);
