package com.example.babything_api.modules.settlements.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import com.example.babything_api.modules.settlements.entity.PayoutAccount;

/** Dùng cho cả đọc và ghi; updatedAt bị bỏ qua khi ghi. */
public record PayoutAccountDto(
        @NotBlank(message = "Chọn ngân hàng") @Size(max = 20) String bankCode,
        @NotBlank(message = "Nhập số tài khoản")
        @Pattern(regexp = "^\\d{6,19}$", message = "Số tài khoản gồm 6–19 chữ số") String accountNo,
        @NotBlank(message = "Nhập tên chủ tài khoản") @Size(min = 3, max = 100, message = "Tên chủ tài khoản 3–100 ký tự")
        String holderName,
        Instant updatedAt) {

    public static PayoutAccountDto from(PayoutAccount a) {
        return a == null ? null
                : new PayoutAccountDto(a.getBankCode(), a.getAccountNo(), a.getHolderName(), a.getUpdatedAt());
    }
}
