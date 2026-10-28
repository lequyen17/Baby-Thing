-- Giao dịch thanh toán online của người mua cho một đơn hàng. Một đơn có thể có nhiều lần thanh toán
-- (lần trước thất bại / hết hạn thì tạo lần mới), tối đa một lần PAID.
-- amount chụp lại tổng tiền đơn lúc tạo giao dịch; transaction_ref là mã gửi sang cổng thanh toán.
CREATE TABLE payments (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id         BIGINT         NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    user_id          BIGINT         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    amount           NUMERIC(14, 2) NOT NULL,
    method           VARCHAR(20)    NOT NULL,
    status           VARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    provider         VARCHAR(30)    NULL,
    transaction_ref  VARCHAR(64)    NOT NULL,
    provider_txn_id  VARCHAR(100)   NULL,
    failure_reason   VARCHAR(500)   NULL,
    expires_at       TIMESTAMPTZ    NULL,
    paid_at          TIMESTAMPTZ    NULL,
    refunded_at      TIMESTAMPTZ    NULL,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT uq_payments_transaction_ref UNIQUE (transaction_ref),
    CONSTRAINT ck_payments_amount CHECK (amount >= 0),
    CONSTRAINT ck_payments_method CHECK (method IN ('QR', 'ATM_CARD', 'E_WALLET')),
    CONSTRAINT ck_payments_status CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED'))
);
-- "Thanh toán của tôi"
CREATE INDEX idx_payments_user_created ON payments (user_id, created_at DESC);
CREATE INDEX idx_payments_order ON payments (order_id);
-- Một đơn chỉ được thanh toán thành công một lần
CREATE UNIQUE INDEX uq_payments_order_paid ON payments (order_id) WHERE status = 'PAID';
