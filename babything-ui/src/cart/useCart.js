import { useEffect, useState } from 'react';
import { api } from '../api/client';

/** Phát sau mỗi lần giỏ đổi (thêm, sửa, đặt hàng) để số trên header đọc lại. */
export const CART_CHANGED_EVENT = 'cart-changed';

export const notifyCartChanged = () => window.dispatchEvent(new Event(CART_CHANGED_EVENT));

/** Thêm vào giỏ (cộng dồn nếu đã có); trả về cả giỏ mới. */
export async function addToCart(productId, quantity = 1) {
  const cart = await api('/cart/items', { method: 'POST', body: { productId, quantity } });
  notifyCartChanged();
  return cart;
}

/** Số sản phẩm trong giỏ cho icon trên header; enabled = false (admin) thì không gọi API. */
export function useCartCount(enabled = true) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    const load = () =>
      api('/cart/count')
        .then((data) => setCount(data.count))
        .catch(() => setCount(0));
    load();
    window.addEventListener(CART_CHANGED_EVENT, load);
    return () => window.removeEventListener(CART_CHANGED_EVENT, load);
  }, [enabled]);
  return count;
}

/** Dòng giỏ → dòng hàng của form đặt hàng (cùng dạng fromProduct trong OrderFormPage). */
export const cartItemToOrderItem = (i) => ({
  productId: i.productId,
  name: i.name,
  sku: i.sku,
  imageUrl: i.imageUrl,
  price: Number(i.price),
  stock: i.stock,
  sellerId: i.sellerId,
  sellerName: i.sellerName,
  quantity: i.quantity,
});
