-- Giỏ hàng của người mua, lưu ở server để dùng được trên nhiều thiết bị. Mỗi sản phẩm một dòng.
-- price_at_add: giá lúc bỏ vào giỏ, để báo người mua khi người bán đổi giá. Đặt hàng luôn theo giá hiện tại.
CREATE TABLE cart_items (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      BIGINT         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    product_id   BIGINT         NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    quantity     INT            NOT NULL CHECK (quantity BETWEEN 1 AND 999),
    price_at_add NUMERIC(12, 2) NOT NULL,
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT uq_cart_items_user_product UNIQUE (user_id, product_id)
);
CREATE INDEX idx_cart_items_user ON cart_items (user_id, created_at DESC);
