package com.example.babything_api.modules.orders.entity;

import java.util.Map;
import java.util.Set;

/** Luồng xử lý: PENDING → CONFIRMED → SHIPPING → DELIVERED; huỷ được khi chưa giao cho vận chuyển. */
public enum OrderStatus {
    PENDING,
    CONFIRMED,
    SHIPPING,
    DELIVERED,
    CANCELLED;

    /** Các bước người bán / admin được chuyển tới bằng PATCH /status. Huỷ đi qua endpoint /cancel riêng để hoàn kho. */
    private static final Map<OrderStatus, Set<OrderStatus>> NEXT = Map.of(
            PENDING, Set.of(CONFIRMED),
            CONFIRMED, Set.of(SHIPPING),
            SHIPPING, Set.of(DELIVERED),
            DELIVERED, Set.of(),
            CANCELLED, Set.of());

    public boolean canMoveTo(OrderStatus next) {
        return NEXT.get(this).contains(next);
    }

    /** Người mua chỉ sửa / huỷ được khi người bán chưa xác nhận. */
    public boolean isEditable() {
        return this == PENDING;
    }

    /** Người bán / admin huỷ được khi chưa giao cho vận chuyển. */
    public boolean isCancellableBySeller() {
        return this == PENDING || this == CONFIRMED;
    }
}
