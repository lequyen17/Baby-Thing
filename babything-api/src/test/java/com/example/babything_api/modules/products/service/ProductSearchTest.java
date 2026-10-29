package com.example.babything_api.modules.products.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class ProductSearchTest {

    @Test
    void stripsVietnameseAccentsLikePostgresUnaccent() {
        assertEquals("ao so sinh", ProductService.stripAccents("áo sơ sinh"));
        assertEquals("xe day em be", ProductService.stripAccents("xe đẩy em bé"));
        assertEquals("Dam cotton", ProductService.stripAccents("Đầm cotton"));
        assertEquals("ao so sinh", ProductService.stripAccents("ao so sinh"));
    }
}
