/** Nhãn và màu badge cho từng trạng thái giao dịch (khớp PaymentStatus phía API). */
export const PAYMENT_STATUSES = {
  PENDING: { label: 'Chờ thanh toán', badge: 'badge-warning' },
  PAID: { label: 'Đã thanh toán', badge: 'badge-success' },
  FAILED: { label: 'Thất bại', badge: 'badge-danger' },
  EXPIRED: { label: 'Hết hạn', badge: 'badge-muted' },
  REFUNDED: { label: 'Đã hoàn tiền', badge: '' },
};

/** Khớp PaymentMethod phía API. */
export const PAYMENT_METHODS = {
  QR: 'Quét mã QR',
  ATM_CARD: 'Thẻ ATM nội địa',
  E_WALLET: 'Ví điện tử',
};

export function PaymentStatusBadge({ status }) {
  const info = PAYMENT_STATUSES[status] ?? { label: status, badge: '' };
  return <span className={`badge ${info.badge}`}>{info.label}</span>;
}
