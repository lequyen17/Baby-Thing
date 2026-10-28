-- Luồng giao dịch tự đăng (tài liệu BMC 7.3): tin đăng qua kiểm duyệt → đặt hàng → thanh toán online
-- → người bán xác nhận / giao → người mua xác nhận nhận hàng → quyết toán người bán (giá bán − 10% hoa hồng).

-- ---------------------------------------------------------------- Tin đăng

-- PENDING_REVIEW = chờ admin duyệt, REJECTED = bị từ chối (xem reject_reason).
-- reviewed_at != NULL = nội dung hiện tại đã được duyệt; người bán sửa nội dung thì bị đặt lại NULL.
ALTER TABLE products DROP CONSTRAINT ck_products_status;
ALTER TABLE products
    ADD CONSTRAINT ck_products_status CHECK (status IN ('PENDING_REVIEW', 'ACTIVE', 'INACTIVE', 'REJECTED')),
    ADD COLUMN brand          VARCHAR(100)  NULL,
    ADD COLUMN age_range      VARCHAR(20)   NULL,
    ADD COLUMN size           VARCHAR(30)   NULL,
    ADD COLUMN defects        VARCHAR(1000) NULL,
    ADD COLUMN usage_duration VARCHAR(50)   NULL,
    ADD COLUMN reject_reason  VARCHAR(500)  NULL,
    ADD COLUMN reviewed_by    BIGINT        NULL REFERENCES users (id) ON DELETE SET NULL,
    ADD COLUMN reviewed_at    TIMESTAMPTZ   NULL,
    ADD CONSTRAINT ck_products_age_range
        CHECK (age_range IN ('NEWBORN', 'M0_6', 'M6_12', 'Y1_2', 'Y2_3', 'Y3_PLUS'));

-- Tin cũ đã đang hiển thị: coi như đã duyệt.
UPDATE products SET reviewed_at = created_at WHERE deleted_at IS NULL;

CREATE INDEX idx_products_status_created ON products (status, created_at) WHERE deleted_at IS NULL;

-- Nhiều ảnh thật cho một tin; products.image_url giữ ảnh đầu tiên (ảnh bìa) cho thẻ sản phẩm và đơn hàng.
CREATE TABLE product_images (
    product_id BIGINT       NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    position   INTEGER      NOT NULL,
    url        VARCHAR(500) NOT NULL,
    PRIMARY KEY (product_id, position)
);
INSERT INTO product_images (product_id, position, url)
SELECT id, 0, image_url FROM products WHERE image_url IS NOT NULL;

-- ---------------------------------------------------------------- Đơn hàng

-- AWAITING_PAYMENT = đã giữ hàng, chờ người mua thanh toán (quá payment_due_at thì tự huỷ).
-- PENDING = đã thanh toán, chờ người bán xác nhận. COMPLETED = người mua xác nhận nhận hàng / hết hạn kiểm hàng.
ALTER TABLE orders DROP CONSTRAINT ck_orders_status;
ALTER TABLE orders
    ADD CONSTRAINT ck_orders_status CHECK (status IN ('AWAITING_PAYMENT', 'PENDING', 'CONFIRMED', 'SHIPPING',
                                                      'DELIVERED', 'COMPLETED', 'CANCELLED')),
    ALTER COLUMN status SET DEFAULT 'AWAITING_PAYMENT',
    ADD COLUMN payment_due_at TIMESTAMPTZ NULL,
    ADD COLUMN paid_at        TIMESTAMPTZ NULL,
    ADD COLUMN confirmed_at   TIMESTAMPTZ NULL,
    ADD COLUMN shipped_at     TIMESTAMPTZ NULL,
    ADD COLUMN delivered_at   TIMESTAMPTZ NULL,
    ADD COLUMN completed_at   TIMESTAMPTZ NULL,
    ADD COLUMN tracking_code  VARCHAR(50) NULL;

-- Job quét đơn quá hạn thanh toán / hết hạn kiểm hàng.
CREATE INDEX idx_orders_awaiting_due ON orders (payment_due_at) WHERE status = 'AWAITING_PAYMENT';
CREATE INDEX idx_orders_delivered_at ON orders (delivered_at) WHERE status = 'DELIVERED';

-- Bản chụp tin đăng lúc mua: căn cứ đối chiếu khi kiểm hàng / khiếu nại. image_urls cách nhau bằng xuống dòng.
ALTER TABLE order_items
    ADD COLUMN description    TEXT          NULL,
    ADD COLUMN item_condition VARCHAR(20)   NULL,
    ADD COLUMN brand          VARCHAR(100)  NULL,
    ADD COLUMN age_range      VARCHAR(20)   NULL,
    ADD COLUMN size           VARCHAR(30)   NULL,
    ADD COLUMN defects        VARCHAR(1000) NULL,
    ADD COLUMN usage_duration VARCHAR(50)   NULL,
    ADD COLUMN image_urls     TEXT          NULL;

-- ---------------------------------------------------------------- Thanh toán

CREATE INDEX idx_payments_pending_expires ON payments (expires_at) WHERE status = 'PENDING';

-- ---------------------------------------------------------------- Quyết toán người bán

-- Một dòng cho mỗi đơn hoàn tất. net_amount = gross_amount − commission_amount, chuyển cho người bán theo kỳ.
CREATE TABLE settlements (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id          BIGINT         NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    seller_id         BIGINT         NULL REFERENCES users (id) ON DELETE SET NULL,
    gross_amount      NUMERIC(14, 2) NOT NULL,
    commission_rate   NUMERIC(5, 4)  NOT NULL,
    commission_amount NUMERIC(14, 2) NOT NULL,
    net_amount        NUMERIC(14, 2) NOT NULL,
    status            VARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    payout_reference  VARCHAR(100)   NULL,
    paid_by           BIGINT         NULL REFERENCES users (id) ON DELETE SET NULL,
    paid_at           TIMESTAMPTZ    NULL,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT uq_settlements_order UNIQUE (order_id),
    CONSTRAINT ck_settlements_status CHECK (status IN ('PENDING', 'PAID')),
    CONSTRAINT ck_settlements_amounts CHECK (gross_amount >= 0 AND commission_amount >= 0 AND net_amount >= 0)
);
CREATE INDEX idx_settlements_seller_created ON settlements (seller_id, created_at DESC);
CREATE INDEX idx_settlements_status_created ON settlements (status, created_at DESC);

-- Tài khoản ngân hàng nhận tiền quyết toán của người bán.
CREATE TABLE payout_accounts (
    user_id     BIGINT       PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    bank_code   VARCHAR(20)  NOT NULL,
    account_no  VARCHAR(19)  NOT NULL,
    holder_name VARCHAR(100) NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_payout_accounts_no CHECK (account_no ~ '^[0-9]{6,19}$')
);
