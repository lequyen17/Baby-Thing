package com.example.babything_api.modules.products.service;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.babything_api.core.dto.PageResponse;
import com.example.babything_api.modules.products.dto.ProductHistoryItem;
import com.example.babything_api.modules.products.dto.ProductViewStats;
import com.example.babything_api.modules.products.dto.ProductViewerItem;
import com.example.babything_api.modules.products.repository.ProductViewRepository;
import com.example.babything_api.modules.users.entity.User;

/** Lịch sử xem sản phẩm: của chính mình (user) và ai đã xem một sản phẩm (người bán hoặc admin). */
@Service
public class ProductViewService {

    private final ProductViewRepository viewRepository;
    private final ProductService productService;

    public ProductViewService(ProductViewRepository viewRepository, ProductService productService) {
        this.viewRepository = viewRepository;
        this.productService = productService;
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductHistoryItem> myHistory(User user, int page, int size) {
        return PageResponse.of(viewRepository.findHistory(user.getId(), pageRequest(page, size)),
                ProductHistoryItem::from);
    }

    @Transactional
    public void removeFromHistory(User user, Long productId) {
        viewRepository.deleteEntry(user.getId(), productId);
    }

    @Transactional
    public void clearHistory(User user) {
        viewRepository.deleteAllForUser(user.getId());
    }

    @Transactional(readOnly = true)
    public ProductViewStats viewers(User user, Long productId, int page, int size) {
        productService.findManageable(user, productId);
        return new ProductViewStats(viewRepository.sumViews(productId),
                PageResponse.of(viewRepository.findViewers(productId, pageRequest(page, size)),
                        ProductViewerItem::from));
    }

    private static PageRequest pageRequest(int page, int size) {
        return PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(size, ProductService.MAX_PAGE_SIZE)));
    }
}
