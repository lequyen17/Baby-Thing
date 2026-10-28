-- BabyThings Care (tài liệu BMC 7.4): người bán ký gửi một lô 1–5 món, Baby Things kiểm tra, làm sạch, chụp ảnh
-- và bán hộ trên marketplace chung với nhãn Renewed. Hàng vẫn thuộc người bán cho đến khi bán được.

-- ---------------------------------------------------------------- Lô ký gửi

-- SUBMITTED = chờ sàng lọc, WAITLISTED = kho đầy, PRE_QUOTED = đã báo giá sơ bộ chờ người bán đồng ý,
-- AWAITING_DROPOFF = đã thoả thuận, chờ gửi hàng, RECEIVED = đã nhận, đang kiểm tra, QUOTED = báo giá chính thức
-- chờ duyệt phí, CLEANING = đã trả phí, đang làm sạch, SELLING = đang bán (60 ngày, gia hạn 1 lần 30 ngày),
-- RETURNING = chờ hoàn trả hàng chưa bán, CLOSED = kết thúc, DECLINED = không nhận, CANCELLED = người bán huỷ.
CREATE TABLE care_batches (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code                VARCHAR(20)    NOT NULL,
    seller_id           BIGINT         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status              VARCHAR(20)    NOT NULL DEFAULT 'SUBMITTED',
    dropoff_method      VARCHAR(20)    NOT NULL,
    seller_note         VARCHAR(1000)  NULL,
    decline_reason      VARCHAR(500)   NULL,
    -- Báo giá sơ bộ: khoảng giá niêm yết cả lô và phí vệ sinh dự kiến
    expected_min        NUMERIC(12, 2) NULL,
    expected_max        NUMERIC(12, 2) NULL,
    estimated_fee       NUMERIC(12, 2) NULL,
    pre_quoted_at       TIMESTAMPTZ    NULL,
    agreed_at           TIMESTAMPTZ    NULL,
    received_at         TIMESTAMPTZ    NULL,
    intake_note         VARCHAR(1000)  NULL,
    -- Báo giá chính thức
    cleaning_fee        NUMERIC(12, 2) NULL,
    quoted_at           TIMESTAMPTZ    NULL,
    fee_payment_ref     VARCHAR(40)    NULL,
    fee_paid_at         TIMESTAMPTZ    NULL,
    cleaned_at          TIMESTAMPTZ    NULL,
    listed_at           TIMESTAMPTZ    NULL,
    expires_at          TIMESTAMPTZ    NULL,
    extended_at         TIMESTAMPTZ    NULL,
    price_dropped_at    TIMESTAMPTZ    NULL,
    expiry_reminded_at  TIMESTAMPTZ    NULL,
    return_reason       VARCHAR(500)   NULL,
    returned_at         TIMESTAMPTZ    NULL,
    closed_at           TIMESTAMPTZ    NULL,
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT uq_care_batches_code UNIQUE (code),
    CONSTRAINT ck_care_batches_status CHECK (status IN ('SUBMITTED', 'WAITLISTED', 'PRE_QUOTED', 'AWAITING_DROPOFF',
                                                        'RECEIVED', 'QUOTED', 'CLEANING', 'SELLING', 'RETURNING',
                                                        'CLOSED', 'DECLINED', 'CANCELLED')),
    CONSTRAINT ck_care_batches_dropoff CHECK (dropoff_method IN ('SHIP', 'DROP_OFF'))
);
CREATE INDEX idx_care_batches_seller ON care_batches (seller_id, created_at DESC);
CREATE INDEX idx_care_batches_status ON care_batches (status, created_at);

-- ---------------------------------------------------------------- Món trong lô

-- PENDING = người bán khai báo, ACCEPTED = đạt kiểm tra (có cấp + giá), REJECTED = không đạt, trả lại cùng lô,
-- LISTED = đang bán (product_id), SOLD = đã bán, RETURNED = đã hoàn trả người bán.
-- floor_price = giá thấp nhất người bán đã duyệt; ngày 45 chưa bán thì giảm về mức này.
CREATE TABLE care_items (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    batch_id           BIGINT         NOT NULL REFERENCES care_batches (id) ON DELETE CASCADE,
    position           INTEGER        NOT NULL,
    name               VARCHAR(200)   NOT NULL,
    category           VARCHAR(100)   NOT NULL,
    size               VARCHAR(30)    NULL,
    age_range          VARCHAR(20)    NULL,
    brand              VARCHAR(100)   NULL,
    desired_price      NUMERIC(12, 2) NOT NULL,
    seller_description VARCHAR(2000)  NULL,
    photo_url          VARCHAR(500)   NULL,
    status             VARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    grade              VARCHAR(1)     NULL,
    defects            VARCHAR(1000)  NULL,
    reject_reason      VARCHAR(500)   NULL,
    list_price         NUMERIC(12, 2) NULL,
    floor_price        NUMERIC(12, 2) NULL,
    product_id         BIGINT         NULL REFERENCES products (id) ON DELETE SET NULL,
    sold_at            TIMESTAMPTZ    NULL,
    created_at         TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT uq_care_items_position UNIQUE (batch_id, position),
    CONSTRAINT ck_care_items_status CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'LISTED', 'SOLD', 'RETURNED')),
    CONSTRAINT ck_care_items_grade CHECK (grade IN ('A', 'B', 'C')),
    CONSTRAINT ck_care_items_prices CHECK (desired_price > 0 AND (floor_price IS NULL OR floor_price <= list_price))
);
CREATE INDEX idx_care_items_product ON care_items (product_id) WHERE product_id IS NOT NULL;

-- Tin đăng tạo từ một món Care: mang nhãn BabyThings Renewed, chỉ Baby Things quản lý.
ALTER TABLE products ADD COLUMN care_item_id BIGINT NULL REFERENCES care_items (id) ON DELETE SET NULL;
CREATE UNIQUE INDEX uq_products_care_item ON products (care_item_id) WHERE care_item_id IS NOT NULL;

-- Đơn gồm hàng Care: Baby Things lấy hàng từ kho và giao, người bán chỉ theo dõi.
ALTER TABLE orders ADD COLUMN care BOOLEAN NOT NULL DEFAULT false;
