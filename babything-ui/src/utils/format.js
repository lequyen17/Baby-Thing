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

/** Độ tuổi phù hợp, khớp enum AgeRange ở backend. */
export const AGE_RANGES = [
  ['NEWBORN', 'Sơ sinh'],
  ['M0_6', '0–6 tháng'],
  ['M6_12', '6–12 tháng'],
  ['Y1_2', '1–2 tuổi'],
  ['Y2_3', '2–3 tuổi'],
  ['Y3_PLUS', 'Trên 3 tuổi'],
];

export function formatAgeRange(value) {
  return AGE_RANGES.find(([key]) => key === value)?.[1] ?? null;
}

/** Trạng thái tin đăng, khớp ProductStatus ở backend. */
export const PRODUCT_STATUSES = {
  PENDING_REVIEW: { label: 'Chờ duyệt', badge: 'badge-warning' },
  ACTIVE: { label: 'Đang hiển thị', badge: 'badge-success' },
  INACTIVE: { label: 'Đang ẩn', badge: 'badge-muted' },
  REJECTED: { label: 'Bị từ chối', badge: 'badge-danger' },
};

/** Số phần trăm từ tỉ lệ 0.1 → "10%". */
export function formatPercent(rate) {
  return `${Math.round(Number(rate) * 1000) / 10}%`;
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
