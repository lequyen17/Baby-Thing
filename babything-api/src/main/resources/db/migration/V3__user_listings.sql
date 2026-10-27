-- Mọi thành viên được đăng bán: created_by giờ là người bán (chủ tin đăng), không chỉ là admin đã tạo.
-- Thêm tình trạng đồ cũ; NULL = không ghi rõ (các sản phẩm admin tạo trước đây).
ALTER TABLE products
    ADD COLUMN item_condition VARCHAR(20) NULL,
    ADD CONSTRAINT ck_products_item_condition
        CHECK (item_condition IN ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR'));

-- "Tin đăng của tôi" lọc theo người bán.
CREATE INDEX idx_products_created_by ON products (created_by, created_at DESC) WHERE deleted_at IS NULL;
