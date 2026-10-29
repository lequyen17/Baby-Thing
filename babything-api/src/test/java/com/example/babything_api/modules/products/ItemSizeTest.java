package com.example.babything_api.modules.products;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

import com.example.babything_api.modules.products.entity.ItemSize;

class ItemSizeTest {

    @Test
    void sameSizeWrittenDifferentlyBecomesOneValue() {
        assertEquals("80", ItemSize.normalize("80"));
        assertEquals("80", ItemSize.normalize("80cm"));
        assertEquals("80", ItemSize.normalize(" 80 CM "));
        assertEquals("80", ItemSize.normalize("size 80"));
        assertEquals("6-12M", ItemSize.normalize("6 - 12 m"));
        assertEquals("6-12M", ItemSize.normalize("6–12M"));
        assertEquals("2Y", ItemSize.normalize("2 y"));
        assertEquals("FREE SIZE", ItemSize.normalize("free   size"));
    }

    @Test
    void blankIsNull() {
        assertNull(ItemSize.normalize(null));
        assertNull(ItemSize.normalize("   "));
        assertNull(ItemSize.normalize("size"));
    }
}
