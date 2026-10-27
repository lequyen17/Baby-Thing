const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

export function formatDate(value) {
  return value ? dateFormat.format(new Date(value)) : '—';
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
