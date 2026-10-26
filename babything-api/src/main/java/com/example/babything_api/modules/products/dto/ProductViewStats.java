package com.example.babything_api.modules.products.dto;

import com.example.babything_api.core.dto.PageResponse;

/** totalViews = tổng số lượt xem, viewers.totalItems = số người xem khác nhau. */
public record ProductViewStats(long totalViews, PageResponse<ProductViewerItem> viewers) {
}
