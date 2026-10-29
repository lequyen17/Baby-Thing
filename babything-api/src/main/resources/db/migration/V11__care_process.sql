-- Bổ sung quy trình Care theo tài liệu BMC 7.4.2 / 7.5.3:
-- phạm vi điều chỉnh giá ngay từ báo giá sơ bộ, phiên bản thoả thuận người bán đã đồng ý,
-- biên bản tiếp nhận có ảnh, bước làm sạch ghi người thực hiện, đề xuất giảm giá ngoài phạm vi chờ người bán duyệt.

ALTER TABLE care_batches
    ADD COLUMN max_discount       NUMERIC(4, 3) CHECK (max_discount >= 0 AND max_discount <= 0.5),
    ADD COLUMN agreement_version  VARCHAR(20),
    ADD COLUMN cleaned_by         VARCHAR(100),
    ADD COLUMN clean_note         VARCHAR(1000),
    ADD COLUMN price_proposed_at  TIMESTAMPTZ;

ALTER TABLE care_items
    ADD COLUMN proposed_price NUMERIC(12, 2) CHECK (proposed_price > 0);

-- Ảnh chụp tình trạng lúc nhận hàng (biên bản tiếp nhận điện tử)
CREATE TABLE care_intake_photos (
    batch_id BIGINT       NOT NULL REFERENCES care_batches (id) ON DELETE CASCADE,
    position INT          NOT NULL,
    url      VARCHAR(500) NOT NULL,
    PRIMARY KEY (batch_id, position)
);
