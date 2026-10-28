package com.example.babything_api.modules.orders.entity;

import java.util.Map;
import java.util.Set;

/**
 * Luồng giao dịch tự đăng (tài liệu BMC 7.3.1):
 * AWAITING_PAYMENT → (thanh toán thành công) PENDING → CONFIRMED → SHIPPING → DELIVERED
 * → (người mua xác nhận / hết hạn kiểm hàng) COMPLETED. Huỷ được khi chưa giao cho vận chuyển.
 */
public enum OrderStatus {
    AWAITING_PAYMENT("Chờ thanh toán"),
    PENDING("Chờ xác nhận"),
    CONFIRMED("Đã xác nhận"),
    SHIPPING("Đang giao"),
    DELIVERED("Đã giao"),
    COMPLETED("Hoàn tất"),
    CANCELLED("Đã huỷ");

    private final String label;

    OrderStatus(String label) {
        this.label = label;
    }

    /** Tên hiển thị trong thông báo lỗi, khớp ORDER_STATUSES phía UI. */
    public String label() {
        return label;
    }

    /**
     * Các bước người bán / admin được chuyển tới bằng PATCH /status. Thanh toán, nhận hàng và huỷ đi qua
     * endpoint riêng vì kèm việc khác (ghi nhận tiền, quyết toán, hoàn kho / hoàn tiền).
     */
    private static final Map<OrderStatus, Set<OrderStatus>> NEXT = Map.of(
            AWAITING_PAYMENT, Set.of(),
            PENDING, Set.of(CONFIRMED),
            CONFIRMED, Set.of(SHIPPING),
            SHIPPING, Set.of(DELIVERED),
            DELIVERED, Set.of(),
            COMPLETED, Set.of(),
            CANCELLED, Set.of());

    public boolean canMoveTo(OrderStatus next) {
        return NEXT.get(this).contains(next);
    }

    /** Người mua chỉ sửa được đơn khi chưa thanh toán. */
    public boolean isEditable() {
        return this == AWAITING_PAYMENT;
    }

    /** Người mua huỷ được khi người bán chưa xác nhận (đã thanh toán thì được hoàn tiền). */
    public boolean isCancellableByBuyer() {
        return this == AWAITING_PAYMENT || this == PENDING;
    }

    /** Người bán / admin huỷ được khi chưa giao cho vận chuyển. */
    public boolean isCancellableBySeller() {
        return this == AWAITING_PAYMENT || this == PENDING || this == CONFIRMED;
    }
}
