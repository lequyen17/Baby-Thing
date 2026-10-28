-- Mỗi đơn chỉ thuộc một người bán, để người bán tự xác nhận / giao đơn của mình.
-- Đặt hàng của nhiều người bán cùng lúc thì server tách thành nhiều đơn.
-- seller_id NULL = sản phẩm không còn người bán (tài khoản đã xoá), chỉ admin xử lý.
ALTER TABLE orders
    ADD COLUMN seller_id BIGINT NULL REFERENCES users (id) ON DELETE SET NULL;

-- Đơn cũ: gán người bán của dòng hàng đầu tiên (đơn chỉ có một người bán thì đúng luôn).
UPDATE orders o
SET seller_id = s.seller_id
FROM (SELECT i.order_id, MIN(p.created_by) AS seller_id
      FROM order_items i
      JOIN products p ON p.id = i.product_id
      GROUP BY i.order_id) s
WHERE s.order_id = o.id;

-- Đơn cũ có hàng của người bán khác: chuyển các dòng đó sang một đơn mới, giữ nguyên người mua,
-- thông tin giao hàng, trạng thái và thời gian. Vòng lặp đọc danh sách một lần nên không gặp lại đơn vừa tạo.
DO $$
DECLARE
    r      RECORD;
    new_id BIGINT;
BEGIN
    FOR r IN
        SELECT DISTINCT i.order_id, p.created_by AS seller_id
        FROM order_items i
        JOIN products p ON p.id = i.product_id
        JOIN orders o ON o.id = i.order_id
        WHERE p.created_by IS DISTINCT FROM o.seller_id
    LOOP
        INSERT INTO orders (user_id, seller_id, status, recipient_name, phone, address, note, total_amount,
                            cancel_reason, cancelled_by, cancelled_at, created_at, updated_at)
        SELECT user_id, r.seller_id, status, recipient_name, phone, address, note, 0,
               cancel_reason, cancelled_by, cancelled_at, created_at, updated_at
        FROM orders
        WHERE id = r.order_id
        RETURNING id INTO new_id;

        UPDATE order_items i
        SET order_id = new_id
        FROM products p
        WHERE p.id = i.product_id
          AND i.order_id = r.order_id
          AND p.created_by IS NOT DISTINCT FROM r.seller_id;
    END LOOP;
END $$;

UPDATE orders o
SET total_amount = t.total
FROM (SELECT order_id, SUM(line_total) AS total FROM order_items GROUP BY order_id) t
WHERE t.order_id = o.id
  AND o.total_amount <> t.total;

-- "Đơn bán" của người bán.
CREATE INDEX idx_orders_seller_created ON orders (seller_id, created_at DESC);
