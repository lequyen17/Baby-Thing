package com.example.babything_api.modules.products.controller;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import com.example.babything_api.core.dto.PageResponse;
import com.example.babything_api.core.security.AuthPrincipal;
import com.example.babything_api.modules.products.dto.ProductRequest;
import com.example.babything_api.modules.products.dto.ProductResponse;
import com.example.babything_api.modules.products.dto.ProductViewStats;
import com.example.babything_api.modules.products.entity.ProductStatus;
import com.example.babything_api.modules.products.service.ProductService;
import com.example.babything_api.modules.products.service.ProductViewService;

/** Ghi (POST/PUT/DELETE) và /{id}/views chỉ dành cho ADMIN, xem SecurityConfig. */
@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;
    private final ProductViewService viewService;

    public ProductController(ProductService productService, ProductViewService viewService) {
        this.productService = productService;
        this.viewService = viewService;
    }

    @GetMapping
    PageResponse<ProductResponse> list(@AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) ProductStatus status,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return productService.list(principal.user(),
                new ProductService.ListQuery(q, category, status, minPrice, maxPrice, sort, page, size));
    }

    @GetMapping("/categories")
    List<String> categories(@AuthenticationPrincipal AuthPrincipal principal) {
        return productService.categories(principal.user());
    }

    @GetMapping("/{id}")
    ProductResponse get(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        return productService.view(principal.user(), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ProductResponse create(@AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody ProductRequest req) {
        return productService.create(principal.user(), req);
    }

    @PutMapping("/{id}")
    ProductResponse update(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
            @Valid @RequestBody ProductRequest req) {
        return productService.update(principal.user(), id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        productService.delete(principal.user(), id);
    }

    @GetMapping("/{id}/views")
    ProductViewStats viewers(@PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return viewService.viewers(id, page, size);
    }
}
