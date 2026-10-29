/** Nhãn và màu badge cho trạng thái lô Care, khớp CareBatchStatus ở backend. */
export const CARE_STATUSES = {
  SUBMITTED: { label: 'Chờ sàng lọc', badge: 'badge-warning' },
  WAITLISTED: { label: 'Danh sách chờ', badge: 'badge-muted' },
  PRE_QUOTED: { label: 'Chờ đồng ý báo giá sơ bộ', badge: 'badge-warning' },
  AWAITING_DROPOFF: { label: 'Chờ gửi hàng', badge: '' },
  RECEIVED: { label: 'Đang kiểm tra', badge: '' },
  QUOTED: { label: 'Chờ duyệt báo giá', badge: 'badge-warning' },
  CLEANING: { label: 'Đang làm sạch', badge: '' },
  SELLING: { label: 'Đang bán', badge: 'badge-success' },
  RETURNING: { label: 'Chờ hoàn trả', badge: 'badge-warning' },
  CLOSED: { label: 'Đã kết thúc', badge: 'badge-muted' },
  DECLINED: { label: 'Không tiếp nhận', badge: 'badge-danger' },
  CANCELLED: { label: 'Đã huỷ', badge: 'badge-muted' },
};

export const CARE_ITEM_STATUSES = {
  PENDING: { label: 'Chờ kiểm tra', badge: 'badge-muted' },
  ACCEPTED: { label: 'Đạt kiểm tra', badge: 'badge-success' },
  REJECTED: { label: 'Không đạt, trả lại', badge: 'badge-danger' },
  LISTED: { label: 'Đang bán', badge: 'badge-success' },
  SOLD: { label: 'Đã bán', badge: 'badge-success' },
  RETURNED: { label: 'Đã hoàn trả', badge: 'badge-muted' },
};

/** Cấp tình trạng Care (tài liệu BMC 7.5.1). */
export const CARE_GRADES = [
  ['A', 'A – Như mới', 'Chưa dùng hoặc dùng rất ít; không lỗi, không phai màu'],
  ['B', 'B – Rất tốt', 'Dấu hiệu sử dụng nhẹ; không vết bẩn, không hỏng'],
  ['C', 'C – Tốt', 'Dấu hiệu sử dụng rõ (xù, phai nhẹ); lỗi nhỏ được ghi và chụp rõ'],
];

export const DROPOFF_METHODS = {
  SHIP: 'Gửi qua đơn vị vận chuyển',
  DROP_OFF: 'Mang đến điểm nhận',
};

/**
 * Các bước hiển thị trên thanh tiến trình, kèm trường thời điểm trong BatchResponse.
 * Lô bị từ chối / huỷ không hiện thanh này.
 */
export const CARE_STEPS = [
  ['SUBMITTED', 'createdAt', 'Đăng ký'],
  ['PRE_QUOTED', 'preQuotedAt', 'Báo giá sơ bộ'],
  ['AWAITING_DROPOFF', 'agreedAt', 'Đồng ý, gửi hàng'],
  ['RECEIVED', 'receivedAt', 'Nhận & kiểm tra'],
  ['QUOTED', 'quotedAt', 'Báo giá chính thức'],
  ['CLEANING', 'feePaidAt', 'Trả phí vệ sinh'],
  // Không phải trạng thái riêng ở backend: lô CLEANING đã có cleanedAt
  ['CLEANED', 'cleanedAt', 'Làm sạch & QC'],
  ['SELLING', 'listedAt', 'Đang bán'],
  ['CLOSED', 'closedAt', 'Kết thúc'],
];

/** Vị trí của lô trên thanh tiến trình (WAITLISTED ở bước sàng lọc, RETURNING trước kết thúc). */
export function careStepIndex(batch) {
  let step = { WAITLISTED: 'SUBMITTED', RETURNING: 'SELLING' }[batch.status] ?? batch.status;
  if (step === 'CLEANING' && batch.cleanedAt) step = 'CLEANED';
  return CARE_STEPS.findIndex(([s]) => s === step);
}

export function CareStatusBadge({ status }) {
  const info = CARE_STATUSES[status] ?? { label: status, badge: '' };
  return <span className={`badge ${info.badge}`}>{info.label}</span>;
}
