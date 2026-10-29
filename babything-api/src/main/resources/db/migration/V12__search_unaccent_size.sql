-- Tìm kiếm không dấu: người mua gõ "ao so sinh" vẫn ra "Áo sơ sinh" (ProductService so khớp lower(unaccent(cột))).
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Chuẩn hoá size đã nhập tự do theo đúng quy tắc của ItemSize.normalize ở backend,
-- để "80cm", "80 cm" và "80" là cùng một lựa chọn trong bộ lọc size:
-- viết hoa, gộp khoảng trắng, bỏ chữ "SIZE" ở đầu, bỏ khoảng trắng quanh "-" và giữa số với đơn vị,
-- size chỉ có số + CM thì bỏ CM. order_items giữ nguyên vì là bản chụp tin lúc mua.
UPDATE products
SET size = NULLIF(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
        upper(btrim(size)), '[–—]', '-', 'g'), '\s+', ' ', 'g'), '^SIZE ?', ''), ' ?- ?', '-', 'g'),
        '(\d) (CM|M|Y|T)\y', '\1\2', 'g'), '')
WHERE size IS NOT NULL;
UPDATE products SET size = regexp_replace(size, '^(\d+([.,]\d+)?)CM$', '\1') WHERE size ~ '^\d+([.,]\d+)?CM$';

UPDATE care_items
SET size = NULLIF(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
        upper(btrim(size)), '[–—]', '-', 'g'), '\s+', ' ', 'g'), '^SIZE ?', ''), ' ?- ?', '-', 'g'),
        '(\d) (CM|M|Y|T)\y', '\1\2', 'g'), '')
WHERE size IS NOT NULL;
UPDATE care_items SET size = regexp_replace(size, '^(\d+([.,]\d+)?)CM$', '\1') WHERE size ~ '^\d+([.,]\d+)?CM$';
