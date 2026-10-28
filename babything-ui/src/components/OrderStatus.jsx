/** Nhãn, màu badge và nút chuyển bước cho từng trạng thái đơn (khớp OrderStatus phía API). */
export const ORDER_STATUSES = {
  PENDING: { label: 'Pending', badge: 'badge-warning' },
  CONFIRMED: { label: 'Confirmed', badge: '' },
  SHIPPING: { label: 'Shipping', badge: '' },
  DELIVERED: { label: 'Delivered', badge: 'badge-success' },
  CANCELLED: { label: 'Cancelled', badge: 'badge-muted' },
};

/** Admin bấm nút này để đẩy đơn sang bước tiếp theo. */
export const NEXT_STEP = {
  PENDING: { status: 'CONFIRMED', label: 'Confirm order' },
  CONFIRMED: { status: 'SHIPPING', label: 'Mark as shipping' },
  SHIPPING: { status: 'DELIVERED', label: 'Mark as delivered' },
};

export const STEPS = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED'];

export function OrderStatusBadge({ status }) {
  const info = ORDER_STATUSES[status] ?? { label: status, badge: '' };
  return <span className={`badge ${info.badge}`}>{info.label}</span>;
}

/** Quyền thao tác giống OrderService: khách sửa/huỷ khi PENDING, admin huỷ được cả CONFIRMED. */
export function orderPermissions(order, isAdmin) {
  return {
    canEdit: order.status === 'PENDING',
    canCancel: order.status === 'PENDING' || (isAdmin && order.status === 'CONFIRMED'),
    nextStep: isAdmin ? NEXT_STEP[order.status] : undefined,
  };
}
