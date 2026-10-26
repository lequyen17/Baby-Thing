-- Chạy mỗi lần khởi động (spring.sql.init.mode=always), nên mọi lệnh đều phải idempotent.

CREATE TABLE IF NOT EXISTS users (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email               VARCHAR(255) NOT NULL,
    password            VARCHAR(255) NULL,          -- NULL = chỉ đăng nhập Google
    display_name        VARCHAR(50)  NOT NULL,
    avatar_url          VARCHAR(500) NULL,
    role                VARCHAR(20)  NOT NULL DEFAULT 'USER',
    status              VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    email_verified_at   TIMESTAMPTZ  NULL,
    password_changed_at TIMESTAMPTZ  NULL,
    last_login_at       TIMESTAMPTZ  NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT ck_users_email_lowercase CHECK (email = lower(email)),
    CONSTRAINT ck_users_role CHECK (role IN ('USER', 'ADMIN')),
    CONSTRAINT ck_users_status CHECK (status IN ('ACTIVE', 'LOCKED'))
);

-- Mỗi lần rotate là một dòng mới, chung family_id.
-- Mốc bắt đầu phiên = MIN(created_at) của family.
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token          VARCHAR(64)  NOT NULL,          -- SHA-256 hex của refresh token (plain chỉ gửi cho client)
    family_id      UUID         NOT NULL,
    replaced_by_id BIGINT       NULL REFERENCES refresh_tokens (id) ON DELETE SET NULL,
    expires_at     TIMESTAMPTZ  NOT NULL,
    revoked_at     TIMESTAMPTZ  NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_refresh_tokens_token UNIQUE (token)
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens (family_id, created_at);

-- Tài khoản Google đã liên kết với user.
CREATE TABLE IF NOT EXISTS user_identities (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id          BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    provider         VARCHAR(20)  NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email   VARCHAR(255) NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_user_identities_provider CHECK (provider IN ('GOOGLE')),
    CONSTRAINT uq_user_identities_provider_sub UNIQUE (provider, provider_user_id),
    CONSTRAINT uq_user_identities_user_provider UNIQUE (user_id, provider)
);

-- ---------------------------------------------------------------- Sản phẩm

-- Xoá mềm (deleted_at) để lịch sử xem không bị mất; SKU chỉ cần duy nhất trong các sản phẩm chưa xoá.
CREATE TABLE IF NOT EXISTS products (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sku         VARCHAR(64)    NOT NULL,
    name        VARCHAR(200)   NOT NULL,
    description TEXT           NULL,
    price       NUMERIC(12, 2) NOT NULL,
    stock       INTEGER        NOT NULL DEFAULT 0,
    category    VARCHAR(100)   NULL,
    image_url   VARCHAR(500)   NULL,
    status      VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    created_by  BIGINT         NULL REFERENCES users (id) ON DELETE SET NULL,
    updated_by  BIGINT         NULL REFERENCES users (id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ    NULL,
    CONSTRAINT ck_products_sku_uppercase CHECK (sku = upper(sku)),
    CONSTRAINT ck_products_price CHECK (price >= 0),
    CONSTRAINT ck_products_stock CHECK (stock >= 0),
    CONSTRAINT ck_products_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_sku_alive ON products (sku) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at DESC) WHERE deleted_at IS NULL;

-- Lịch sử xem sản phẩm: mỗi cặp (user, product) một dòng, xem lại thì tăng view_count và cập nhật last_viewed_at.
CREATE TABLE IF NOT EXISTS product_views (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    product_id      BIGINT      NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    view_count      INTEGER     NOT NULL DEFAULT 1,
    first_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_viewed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_product_views_user_product UNIQUE (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_product_views_user_last ON product_views (user_id, last_viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_views_product_last ON product_views (product_id, last_viewed_at DESC);
