/** Nhãn, màu badge và nút chuyển bước cho từng trạng thái đơn (khớp OrderStatus phía API). */
export const ORDER_STATUSES = {
  PENDING: { label: 'Chờ xác nhận', badge: 'badge-warning' },
  CONFIRMED: { label: 'Đã xác nhận', badge: '' },
  SHIPPING: { label: 'Đang giao', badge: '' },
  DELIVERED: { label: 'Đã giao', badge: 'badge-success' },
  CANCELLED: { label: 'Đã huỷ', badge: 'badge-muted' },
};

/** Người bán / admin bấm nút này để đẩy đơn sang bước tiếp theo. */
export const NEXT_STEP = {
  PENDING: { status: 'CONFIRMED', label: 'Xác nhận đơn' },
  CONFIRMED: { status: 'SHIPPING', label: 'Bắt đầu giao hàng' },
  SHIPPING: { status: 'DELIVERED', label: 'Xác nhận đã giao' },
};

export const STEPS = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED'];

export function OrderStatusBadge({ status }) {
  const info = ORDER_STATUSES[status] ?? { label: status, badge: '' };
  return <span className={`badge ${info.badge}`}>{info.label}</span>;
}

/**
 * Quyền thao tác giống OrderService: người mua sửa/huỷ khi PENDING; người bán và admin chuyển bước,
 * huỷ được cả khi CONFIRMED.
 */
export function orderPermissions(order, user) {
  const isAdmin = user.role === 'ADMIN';
  const isBuyer = order.customer.id === user.id;
  const isSeller = order.seller?.id === user.id;
  const canManage = isAdmin || isSeller;
  return {
    isBuyer,
    isSeller,
    canEdit: order.status === 'PENDING' && (isBuyer || isAdmin),
    canCancel: canManage ? order.status === 'PENDING' || order.status === 'CONFIRMED' : order.status === 'PENDING',
    nextStep: canManage ? NEXT_STEP[order.status] : undefined,
  };
}
