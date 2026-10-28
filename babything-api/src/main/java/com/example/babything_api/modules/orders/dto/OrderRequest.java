package com.example.babything_api.modules.orders.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Dùng chung cho tạo mới và cập nhật (PUT thay toàn bộ dòng hàng và thông tin giao hàng). */
public record OrderRequest(
        @NotEmpty(message = "Thêm ít nhất một sản phẩm") @Size(max = 50, message = "Một đơn có tối đa 50 sản phẩm")
        List<@Valid OrderItemRequest> items,
        @NotBlank(message = "Vui lòng nhập tên người nhận") @Size(max = 100, message = "Tên người nhận tối đa 100 ký tự")
        String recipientName,
        @NotBlank(message = "Vui lòng nhập số điện thoại")
        @Pattern(regexp = "^\\+?[0-9 .-]{8,20}$", message = "Số điện thoại không hợp lệ")
        String phone,
        @NotBlank(message = "Vui lòng nhập địa chỉ") @Size(max = 500, message = "Địa chỉ tối đa 500 ký tự") String address,
        @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự") String note) {
}
