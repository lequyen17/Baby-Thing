-- Dữ liệu mẫu cho danh sách sản phẩm (bản demo). KHÔNG phải migration Flyway, không tự chạy khi deploy.
-- Cách chạy: Neon -> SQL Editor -> dán toàn bộ file -> Run. Chạy lại nhiều lần không bị trùng.
--
-- - Người bán mẫu "Baby Things Shop" có password NULL: không ai đăng nhập được bằng mật khẩu.
-- - Ảnh khớp với từng món, lấy từ Unsplash (giấy phép Unsplash) và Openverse (CC0 / public domain: Flickr, rawpixel).
--   Ảnh nằm ở máy chủ của các trang đó, không nằm trên R2 nên không tốn hạn mức R2.
-- - SKU bắt đầu bằng "DEMO-" để dễ nhận ra và xoá (xem cuối file).

BEGIN;

INSERT INTO users (email, password, display_name, role, status, email_verified_at)
VALUES ('demo-shop@babything.local', NULL, 'Baby Things Shop', 'USER', 'ACTIVE', now())
ON CONFLICT (email) DO NOTHING;

WITH seller AS (
    SELECT id FROM users WHERE email = 'demo-shop@babything.local'
),
sample (sku, name, description, price, stock, category, brand, item_condition, age_range, size, usage_duration, defects, days_ago, images) AS (
    VALUES
    ('DEMO-001', 'Bộ sách vải kích thích giác quan', '6 cuốn sách vải sột soạt, màu tương phản, giặt máy được.',
     140000, 1, 'Sách & học tập', NULL, 'LIKE_NEW', 'M0_6', NULL, '3 tháng', NULL, 1, ARRAY[
        'https://images.unsplash.com/photo-1782150924537-7a4fe94d837f',
        'https://images.unsplash.com/photo-1455884981818-54cb785db6fc',
        'https://images.unsplash.com/photo-1497633762265-9d179a990aa6']),
    ('DEMO-002', 'Set 5 body cotton sơ sinh', 'Body cotton 100%, giặt bằng tay, còn mềm.',
     180000, 2, 'Quần áo', 'Carter''s', 'LIKE_NEW', 'NEWBORN', '0-3M', '1 tháng', NULL, 2, ARRAY[
        'https://images.unsplash.com/photo-1622290319146-7b63df48a635',
        'https://images.unsplash.com/photo-1766918780914-5df4a5a98c44',
        'https://images.unsplash.com/photo-1768693602418-260d828b878d']),
    ('DEMO-003', 'Ghế ăn dặm gỗ điều chỉnh độ cao', 'Ghế gỗ thông, có khay tháo rời và đai an toàn 5 điểm.',
     650000, 1, 'Ghế ăn dặm', 'Hape', 'GOOD', 'M6_12', NULL, '1 năm', 'Xước nhẹ ở chân ghế', 3, ARRAY[
        'https://images.unsplash.com/photo-1612200057237-59ff4c861453',
        'https://images.unsplash.com/photo-1785224927982-9e32a609576b',
        'https://images.unsplash.com/photo-1760267982929-b038bf9b82e0']),
    ('DEMO-004', 'Xe đẩy gấp gọn Combi Mechacal', 'Xe nhẹ 5kg, gấp một tay, ngả 3 tư thế. Có mái che và giỏ để đồ.',
     1850000, 1, 'Xe đẩy', 'Combi', 'LIKE_NEW', 'M0_6', NULL, '5 tháng', NULL, 1, ARRAY[
        'https://images.unsplash.com/photo-1559135141-2bea6465fccf',
        'https://images.unsplash.com/photo-1714392512700-4cab9e51710b',
        'https://images.unsplash.com/photo-1516309229383-2001fee59b2b']),
    ('DEMO-005', 'Xe tập đi 3 trong 1 có nhạc', 'Có bàn đồ chơi, nhạc và đèn. Chỉnh được 3 nấc cao.',
     390000, 1, 'Đồ chơi', 'Chicco', 'FAIR', 'M6_12', NULL, '1 năm', 'Một nút nhạc không kêu', 6, ARRAY[
        'https://images.unsplash.com/photo-1775346395914-4c116d7712d4',
        'https://images.unsplash.com/photo-1775346395915-de166255b53c']),
    ('DEMO-006', 'Máy hâm sữa và tiệt trùng 2 trong 1', 'Hâm sữa, hâm đồ ăn và tiệt trùng bình. Đầy đủ phụ kiện.',
     320000, 1, 'Đồ dùng ăn uống', 'Fatz Baby', 'GOOD', 'M0_6', NULL, '8 tháng', NULL, 8, ARRAY[
        'https://images.unsplash.com/photo-1623707430616-d9f956bcac2b',
        'https://images.unsplash.com/photo-1635258559918-ed56f88004de']),
    ('DEMO-007', 'Giường cũi gỗ thông kèm nệm', 'Cũi 3 nấc, tháo được thành bên làm giường ghép.',
     1200000, 1, 'Giường cũi', NULL, 'GOOD', 'NEWBORN', '120X60', '2 năm', 'Vết sơn bong nhỏ ở thanh trên', 4, ARRAY[
        'https://images.unsplash.com/photo-1776741146949-cda9f2bc5978',
        'https://images.unsplash.com/photo-1774578342155-8d7e44a18bfd',
        'https://images.unsplash.com/photo-1542901689-8917f44e3541']),
    ('DEMO-008', 'Bộ xếp hình gỗ 100 chi tiết', 'Gỗ tự nhiên, sơn an toàn, có túi đựng.',
     220000, 3, 'Đồ chơi', NULL, 'GOOD', 'Y2_3', NULL, '1 năm', 'Thiếu 2 chi tiết nhỏ', 10, ARRAY[
        'https://images.unsplash.com/photo-1601987177651-8edfe6c20009',
        'https://images.unsplash.com/photo-1589495374906-b7f5ca5de879',
        'https://images.unsplash.com/photo-1668626781268-8b988c940dc7']),
    ('DEMO-009', 'Váy công chúa voan bé gái', 'Mặc 2 lần chụp ảnh, voan 3 lớp, có lót cotton.',
     150000, 1, 'Quần áo', NULL, 'LIKE_NEW', 'Y1_2', '90', '2 lần', NULL, 2, ARRAY[
        'https://images.unsplash.com/photo-1578897367107-2828e351c8a8',
        'https://images.unsplash.com/photo-1578897366846-358bb1c2412a',
        'https://images.unsplash.com/photo-1560506840-ec148e82a604']),
    ('DEMO-010', 'Địu em bé Ergobaby Omni 360', 'Địu 4 tư thế, thoáng khí, dùng từ sơ sinh. Có hộp và sách hướng dẫn.',
     1500000, 1, 'Địu', 'Ergobaby', 'LIKE_NEW', 'NEWBORN', NULL, '6 tháng', NULL, 5, ARRAY[
        'https://images.unsplash.com/photo-1685633224499-dd3759500e8f',
        'https://images.unsplash.com/photo-1783678990858-6e2964cec025',
        'https://images.unsplash.com/photo-1564149809912-731909a19d89']),
    ('DEMO-011', 'Giày tập đi da mềm', 'Đế chống trơn, quai dán. Mới mang thử.',
     120000, 2, 'Giày dép', NULL, 'NEW', 'M6_12', '12', 'Chưa dùng', NULL, 7, ARRAY[
        'https://images.unsplash.com/photo-1783524810691-06673a415621',
        'https://images.unsplash.com/photo-1678192568478-9488ee55def6']),
    ('DEMO-012', 'Máy hút sữa điện đôi Spectra S1', 'Pin sạc, 2 chế độ, đã thay phễu mới.',
     2300000, 1, 'Mẹ bầu & sau sinh', 'Spectra', 'GOOD', NULL, NULL, '7 tháng', NULL, 3, ARRAY[
        'https://live.staticflickr.com/65535/51359579693_46c9495661_b.jpg',
        'https://images.unsplash.com/photo-1723934602247-9243d87b599e']),
    ('DEMO-013', 'Xe đạp thăng bằng cho bé', 'Khung nhôm nhẹ, yên chỉnh độ cao, bánh cao su đặc.',
     550000, 1, 'Xe & vận động', 'Nadle', 'GOOD', 'Y2_3', NULL, '1 năm', 'Xước sơn ở khung', 9, ARRAY[
        'https://images.unsplash.com/photo-1768821766755-6bbaaea5341e',
        'https://images.unsplash.com/photo-1711762730779-e1b161cbbba6',
        'https://images.unsplash.com/photo-1736995660229-a5a7006a4978']),
    ('DEMO-014', 'Giày len sơ sinh (2 đôi)', 'Một đôi len hồng hình cú và một đôi vải trắng. Giữ ấm chân, đế mềm.',
     95000, 1, 'Giày dép', NULL, 'LIKE_NEW', 'NEWBORN', '0-6M', '1 tháng', NULL, 4, ARRAY[
        'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL3B4MTE4ODY2OS1pbWFnZS1rd3Z3N2sydS5qcGc.jpg',
        'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL3B4OTEwOTMwLWltYWdlLWt3dnV0NW91LmpwZw.jpg']),
    ('DEMO-015', 'Gối bầu chữ U đa năng', 'Đỡ lưng, bụng và chân khi ngủ. Vỏ gối tháo giặt được.',
     260000, 1, 'Mẹ bầu & sau sinh', NULL, 'GOOD', NULL, NULL, '4 tháng', NULL, 11, ARRAY[
        'https://live.staticflickr.com/65535/51683511758_631a4dbf82_b.jpg',
        'https://live.staticflickr.com/65535/51881734022_0996a926b4.jpg'])
),
-- Ảnh Unsplash: cắt vuông 800x800 qua tham số của imgix
urls AS (
    SELECT s.sku, i.pos - 1 AS pos,
           CASE WHEN i.url LIKE 'https://images.unsplash.com/%' THEN i.url || '?w=800&h=800&fit=crop&q=80' ELSE i.url END AS url
    FROM sample s CROSS JOIN unnest(s.images) WITH ORDINALITY AS i (url, pos)
),
inserted AS (
    INSERT INTO products (sku, name, description, price, stock, category, image_url, status, created_by, updated_by,
                          item_condition, brand, age_range, size, usage_duration, defects, reviewed_at, created_at, updated_at)
    SELECT s.sku, s.name, s.description, s.price, s.stock, s.category,
           (SELECT u.url FROM urls u WHERE u.sku = s.sku AND u.pos = 0),
           'ACTIVE', seller.id, seller.id,
           s.item_condition, s.brand, s.age_range, s.size, s.usage_duration, s.defects,
           now() - make_interval(days => s.days_ago), now() - make_interval(days => s.days_ago), now()
    FROM sample s CROSS JOIN seller
    WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.sku = s.sku AND p.deleted_at IS NULL)
    RETURNING id, sku
)
INSERT INTO product_images (product_id, position, url)
SELECT ins.id, u.pos, u.url
FROM inserted ins JOIN urls u ON u.sku = ins.sku;

COMMIT;

-- Kiểm tra: SELECT sku, name, price, category FROM products WHERE sku LIKE 'DEMO-%' ORDER BY sku;
--
-- Xoá toàn bộ dữ liệu mẫu (chạy riêng khi không cần nữa; xoá được khi chưa có đơn hàng nào chứa sản phẩm mẫu):
-- DELETE FROM products WHERE sku LIKE 'DEMO-%';
-- DELETE FROM users WHERE email = 'demo-shop@babything.local';
