package com.example.babything_api.modules.orders.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Dùng chung cho tạo mới và cập nhật (PUT thay toàn bộ dòng hàng và thông tin giao hàng). */
public record OrderRequest(
        @NotEmpty(message = "Add at least one product") @Size(max = 50, message = "An order can have at most 50 products")
        List<@Valid OrderItemRequest> items,
        @NotBlank(message = "Recipient name is required") @Size(max = 100) String recipientName,
        @NotBlank(message = "Phone number is required")
        @Pattern(regexp = "^\\+?[0-9 .-]{8,20}$", message = "Phone number is not valid")
        String phone,
        @NotBlank(message = "Address is required") @Size(max = 500) String address,
        @Size(max = 1000) String note) {
}
