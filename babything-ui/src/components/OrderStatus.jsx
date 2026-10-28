/** Nhãn, màu badge và nút chuyển bước cho từng trạng thái đơn (khớp OrderStatus phía API). */
export const ORDER_STATUSES = {
  AWAITING_PAYMENT: { label: 'Chờ thanh toán', badge: 'badge-warning' },
  PENDING: { label: 'Chờ xác nhận', badge: 'badge-warning' },
  CONFIRMED: { label: 'Đã xác nhận', badge: '' },
  SHIPPING: { label: 'Đang giao', badge: '' },
  DELIVERED: { label: 'Đã giao', badge: '' },
  COMPLETED: { label: 'Hoàn tất', badge: 'badge-success' },
  CANCELLED: { label: 'Đã huỷ', badge: 'badge-muted' },
};

/** Người bán / admin bấm nút này để đẩy đơn sang bước tiếp theo. needsTracking: phải nhập mã vận đơn. */
export const NEXT_STEP = {
  PENDING: { status: 'CONFIRMED', label: 'Xác nhận đơn' },
  CONFIRMED: { status: 'SHIPPING', label: 'Giao cho vận chuyển', needsTracking: true },
  SHIPPING: { status: 'DELIVERED', label: 'Xác nhận đã giao' },
};

/** Các bước trên thanh tiến trình, kèm trường thời điểm trong OrderResponse. */
export const STEPS = [
  ['AWAITING_PAYMENT', 'createdAt', 'Đặt hàng'],
  ['PENDING', 'paidAt', 'Đã thanh toán'],
  ['CONFIRMED', 'confirmedAt', 'Người bán xác nhận'],
  ['SHIPPING', 'shippedAt', 'Đang giao'],
  ['DELIVERED', 'deliveredAt', 'Đã giao'],
  ['COMPLETED', 'completedAt', 'Hoàn tất'],
];

export function OrderStatusBadge({ status }) {
  const info = ORDER_STATUSES[status] ?? { label: status, badge: '' };
  return <span className={`badge ${info.badge}`}>{info.label}</span>;
}

/**
 * Quyền thao tác giống OrderService: người mua sửa / thanh toán khi chưa trả tiền, huỷ khi người bán chưa xác nhận,
 * xác nhận nhận hàng khi đã giao; người bán và admin chuyển bước, huỷ được cả khi CONFIRMED.
 */
export function orderPermissions(order, user) {
  const isAdmin = user.role === 'ADMIN';
  const isBuyer = order.customer.id === user.id;
  const isSeller = order.seller?.id === user.id;
  const canManage = isAdmin || isSeller;
  const sellerCancellable = ['AWAITING_PAYMENT', 'PENDING', 'CONFIRMED'].includes(order.status);
  const buyerCancellable = ['AWAITING_PAYMENT', 'PENDING'].includes(order.status);
  return {
    isBuyer,
    isSeller,
    canPay: isBuyer && order.status === 'AWAITING_PAYMENT',
    canEdit: order.status === 'AWAITING_PAYMENT' && (isBuyer || isAdmin),
    canCancel: canManage ? sellerCancellable : isBuyer && buyerCancellable,
    canReceive: order.status === 'DELIVERED' && (isBuyer || isAdmin),
    nextStep: canManage ? NEXT_STEP[order.status] : undefined,
  };
}
