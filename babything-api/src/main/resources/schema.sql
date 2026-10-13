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

-- Dành cho Google login (Level 3), chưa dùng.
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
