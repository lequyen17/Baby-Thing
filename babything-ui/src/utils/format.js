const dateFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
const dayFormat = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** dd/mm/yyyy khi dateOnly, ngược lại kèm giờ (SRS 4.1). */
export function formatDate(value, dateOnly = false) {
  if (!value) return '—';
  return (dateOnly ? dayFormat : dateFormat).format(new Date(value));
}

const priceFormat = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

/** Tình trạng đồ đăng bán, khớp enum ProductCondition ở backend. */
export const CONDITIONS = [
  ['NEW', 'Mới, chưa dùng'],
  ['LIKE_NEW', 'Như mới'],
  ['GOOD', 'Đã dùng, còn tốt'],
  ['FAIR', 'Có dấu hiệu sử dụng'],
];

export function formatCondition(value) {
  return CONDITIONS.find(([key]) => key === value)?.[1] ?? null;
}

export function formatPrice(value) {
  return value === null || value === undefined ? '—' : priceFormat.format(Number(value));
}

/** "5 phút trước", "Hôm qua"... cho thông báo và tin nhắn. */
export function timeAgo(value) {
  const diff = Date.now() - new Date(value).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Vừa xong';
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'Hôm qua';
  if (day < 7) return `${day} ngày trước`;
  return dayFormat.format(new Date(value));
}
