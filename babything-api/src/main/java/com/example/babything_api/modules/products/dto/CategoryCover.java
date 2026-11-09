package com.example.babything_api.modules.products.dto;

/** Một danh mục trên trang chủ: ảnh của tin mới nhất (có thể null) và số tin đang bán. */
public record CategoryCover(String category, String imageUrl, long count) {
}
