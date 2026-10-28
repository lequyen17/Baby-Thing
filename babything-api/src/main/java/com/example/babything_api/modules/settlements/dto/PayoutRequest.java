package com.example.babything_api.modules.settlements.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Admin ghi nhận đã chuyển khoản cho các khoản quyết toán; reference = mã giao dịch ngân hàng. */
public record PayoutRequest(
        @NotEmpty(message = "Chọn ít nhất một khoản") @Size(max = 100, message = "Tối đa 100 khoản mỗi lần")
        List<@NotNull Long> ids,
        @NotBlank(message = "Nhập mã giao dịch chuyển khoản") @Size(max = 100, message = "Mã giao dịch tối đa 100 ký tự")
        String reference) {
}
