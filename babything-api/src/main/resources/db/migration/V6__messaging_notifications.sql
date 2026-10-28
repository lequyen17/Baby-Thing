-- Hội thoại giữa người mua và người bán về một sản phẩm (FR-MSG-01). Mỗi bộ (người mua, người bán, sản phẩm)
-- chỉ có một hội thoại; product_id NULL = hỏi chung từ hồ sơ người bán. Tên/giá/ảnh sản phẩm được chụp lại
-- lúc mở để hội thoại cũ không đổi khi tin bị sửa/xoá.
CREATE TABLE conversations (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    buyer_id          BIGINT         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    seller_id         BIGINT         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    product_id        BIGINT         NULL REFERENCES products (id) ON DELETE SET NULL,
    product_name      VARCHAR(200)   NULL,
    product_price     NUMERIC(12, 2) NULL,
    product_category  VARCHAR(100)   NULL,
    product_image_url VARCHAR(500)   NULL,
    buyer_blocked     BOOLEAN        NOT NULL DEFAULT FALSE,
    seller_blocked    BOOLEAN        NOT NULL DEFAULT FALSE,
    buyer_read_at     TIMESTAMPTZ    NULL,
    seller_read_at    TIMESTAMPTZ    NULL,
    last_message_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT ck_conversations_distinct CHECK (buyer_id <> seller_id)
);
CREATE UNIQUE INDEX uq_conversations_pair ON conversations (buyer_id, seller_id, COALESCE(product_id, 0));
CREATE INDEX idx_conversations_buyer ON conversations (buyer_id, last_message_at DESC);
CREATE INDEX idx_conversations_seller ON conversations (seller_id, last_message_at DESC);

-- image_urls: mỗi URL một dòng (tối đa 5 ảnh).
CREATE TABLE messages (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    conversation_id BIGINT        NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    sender_id       BIGINT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    body            VARCHAR(1000) NULL,
    image_urls      TEXT          NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT ck_messages_content CHECK (body IS NOT NULL OR image_urls IS NOT NULL)
);
CREATE INDEX idx_messages_conversation ON messages (conversation_id, id);

CREATE TABLE conversation_reports (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    conversation_id BIGINT       NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    reporter_id     BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    reason          VARCHAR(500) NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_conversation_reports UNIQUE (conversation_id, reporter_id)
);

-- Thông báo trong app (FR-NOTI-01). group_key: listing, order, dispute, payout, message, security, review, promo, ...
CREATE TABLE notifications (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    group_key  VARCHAR(30)  NOT NULL,
    title      VARCHAR(200) NOT NULL,
    body       VARCHAR(500) NULL,
    link       VARCHAR(200) NULL,
    read_at    TIMESTAMPTZ  NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id) WHERE read_at IS NULL;

-- Chỉ lưu nhóm người dùng đã tắt/bật; nhóm bắt buộc (đơn hàng, bảo mật...) luôn gửi (FR-NOTI-04/05).
CREATE TABLE notification_preferences (
    user_id   BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    group_key VARCHAR(30) NOT NULL,
    enabled   BOOLEAN     NOT NULL,
    PRIMARY KEY (user_id, group_key)
);
