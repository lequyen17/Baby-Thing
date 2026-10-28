package com.example.babything_api.modules.products.dto;

/** URL ảnh vừa tải lên, client gửi lại trong ProductRequest.imageUrl khi lưu tin. */
public record ProductImageResponse(String url) {
}
