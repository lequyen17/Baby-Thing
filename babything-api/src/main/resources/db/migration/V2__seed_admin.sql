-- Seed tài khoản admin cho môi trường development.
-- Đăng nhập: admin@babything.local / Admin@123  (ĐỔI MẬT KHẨU NGAY nếu dùng ngoài dev)
-- crypt(..., gen_salt('bf')) tạo hash bcrypt ($2a$) mà BCryptPasswordEncoder của Spring kiểm tra được.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (email, password, display_name, role, status, email_verified_at, password_changed_at)
VALUES ('admin@babything.local', crypt('Admin@123', gen_salt('bf', 10)), 'Admin', 'ADMIN', 'ACTIVE', now(), now())
ON CONFLICT (email) DO NOTHING;
