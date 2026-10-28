-- Đơn hàng: tạo đơn trừ tồn kho ngay, huỷ đơn thì cộng lại. total_amount = tổng line_total của order_items.
CREATE TABLE orders (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         BIGINT         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status          VARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    recipient_name  VARCHAR(100)   NOT NULL,
    phone           VARCHAR(20)    NOT NULL,
    address         VARCHAR(500)   NOT NULL,
    note            VARCHAR(1000)  NULL,
    total_amount    NUMERIC(14, 2) NOT NULL,
    cancel_reason   VARCHAR(500)   NULL,
    cancelled_by    BIGINT         NULL REFERENCES users (id) ON DELETE SET NULL,
    cancelled_at    TIMESTAMPTZ    NULL,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT ck_orders_status CHECK (status IN ('PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED')),
    CONSTRAINT ck_orders_total CHECK (total_amount >= 0)
);
CREATE INDEX idx_orders_user_created ON orders (user_id, created_at DESC);
CREATE INDEX idx_orders_status_created ON orders (status, created_at DESC);

-- Lưu lại tên, SKU, đơn giá lúc đặt để đơn cũ không đổi khi sản phẩm bị sửa/xoá.
CREATE TABLE order_items (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id     BIGINT         NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id   BIGINT         NOT NULL REFERENCES products (id),
    product_name VARCHAR(200)   NOT NULL,
    product_sku  VARCHAR(64)    NOT NULL,
    image_url    VARCHAR(500)   NULL,
    unit_price   NUMERIC(12, 2) NOT NULL,
    quantity     INTEGER        NOT NULL,
    line_total   NUMERIC(14, 2) NOT NULL,
    CONSTRAINT ck_order_items_quantity CHECK (quantity > 0),
    CONSTRAINT uq_order_items_order_product UNIQUE (order_id, product_id)
);
CREATE INDEX idx_order_items_order ON order_items (order_id);
