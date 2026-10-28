package com.example.babything_api.modules.care.entity;

import java.util.Set;

/** Các bước của một lô ký gửi (tài liệu BMC 7.4.2). */
public enum CareBatchStatus {
    SUBMITTED("Chờ sàng lọc"),
    WAITLISTED("Danh sách chờ"),
    PRE_QUOTED("Chờ bạn đồng ý báo giá sơ bộ"),
    AWAITING_DROPOFF("Chờ gửi hàng"),
    RECEIVED("Đã nhận, đang kiểm tra"),
    QUOTED("Chờ duyệt báo giá & phí"),
    CLEANING("Đang làm sạch"),
    SELLING("Đang bán"),
    RETURNING("Chờ hoàn trả"),
    CLOSED("Đã kết thúc"),
    DECLINED("Không tiếp nhận"),
    CANCELLED("Đã huỷ");

    /** Lô đã được nhận vào kho (hoặc đã hẹn gửi): tính vào sức chứa tối đa của kho. */
    public static final Set<CareBatchStatus> STORED = Set.of(AWAITING_DROPOFF, RECEIVED, QUOTED, CLEANING, SELLING,
            RETURNING);

    private final String label;

    CareBatchStatus(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    /** Người bán huỷ được khi hàng chưa gửi đến kho. */
    public boolean isCancellableBySeller() {
        return this == SUBMITTED || this == WAITLISTED || this == PRE_QUOTED || this == AWAITING_DROPOFF;
    }
}
