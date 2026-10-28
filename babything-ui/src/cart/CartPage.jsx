import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Alert } from '../components/Form';
import { CartIcon, InfoIcon, TrashIcon } from '../components/Icons';
import { ProductImage } from '../components/ProductImage';
import { formatCondition, formatPrice } from '../utils/format';
import { cartItemToOrderItem, notifyCartChanged } from './useCart';

const MAX_QUANTITY = 999;

/** Nhóm theo người bán, giữ thứ tự dòng mới thêm lên trước. Server cũng tách mỗi người bán một đơn. */
function groupBySeller(items) {
  const groups = new Map();
  items.forEach((item) => {
    const key = item.sellerId ?? 'none';
    if (!groups.has(key)) groups.set(key, { sellerId: item.sellerId, sellerName: item.sellerName, items: [] });
    groups.get(key).items.push(item);
  });
  return [...groups.values()];
}

function QuantityStepper({ item, disabled, onChange }) {
  const [value, setValue] = useState(String(item.quantity));
  useEffect(() => setValue(String(item.quantity)), [item.quantity]);
  // Dòng không đặt được vẫn cho giảm (về đúng tồn kho), không cho tăng
  const max = Math.min(item.available ? item.stock : item.quantity, MAX_QUANTITY);

  const commit = (next) => {
    const qty = Math.max(1, Math.min(Number(next) || 1, Math.max(max, 1)));
    setValue(String(qty));
    if (qty !== item.quantity) onChange(qty);
  };

  return (
    <div className="qty-stepper">
      <button type="button" onClick={() => commit(item.quantity - 1)} disabled={disabled || item.quantity <= 1} aria-label="Giảm số lượng">
        −
      </button>
      <input
        type="number"
        min="1"
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => commit(value)}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        aria-label={`Số lượng ${item.name}`}
      />
      <button type="button" onClick={() => commit(item.quantity + 1)} disabled={disabled || item.quantity >= max} aria-label="Tăng số lượng">
        +
      </button>
    </div>
  );
}

/**
 * Giỏ hàng: chọn món muốn mua rồi sang form đặt hàng (địa chỉ giao). Giỏ không giữ hàng; tồn kho chỉ bị trừ khi
 * đặt. Món không còn đặt được (tin bị ẩn / xoá, hết hàng) vẫn hiện kèm lý do để người mua tự bỏ.
 */
export default function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const apply = (data) => {
    setCart(data);
    const availableIds = data.items.filter((i) => i.available).map((i) => i.productId);
    // Lần đầu chọn sẵn mọi món đặt được; sau đó giữ lựa chọn của người mua, bỏ những món không còn đặt được
    setSelected((cur) => (cur === null ? availableIds : cur.filter((id) => availableIds.includes(id))));
  };

  useEffect(() => {
    api('/cart')
      .then(apply)
      .catch((err) => setError(err.message));
  }, []);

  const run = async (request) => {
    setBusy(true);
    setError('');
    try {
      apply(await request());
      notifyCartChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const setQuantity = (item, quantity) =>
    run(() => api(`/cart/items/${item.productId}`, { method: 'PATCH', body: { quantity } }));
  const remove = (item) => run(() => api(`/cart/items/${item.productId}`, { method: 'DELETE' }));
  const removeMany = (ids) =>
    run(() => api(`/cart?${new URLSearchParams(ids.map((id) => ['productIds', String(id)]))}`, { method: 'DELETE' }));

  const groups = useMemo(() => (cart ? groupBySeller(cart.items) : []), [cart]);
  const chosen = cart?.items.filter((i) => selected?.includes(i.productId)) ?? [];
  const unavailable = cart?.items.filter((i) => !i.available) ?? [];
  const total = chosen.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const sellerCount = new Set(chosen.map((i) => i.sellerId)).size;

  const toggle = (ids, on) =>
    setSelected((cur) => (on ? [...new Set([...cur, ...ids])] : cur.filter((id) => !ids.includes(id))));

  const checkout = () =>
    navigate('/orders/new', { state: { cartItems: chosen.map(cartItemToOrderItem) } });

  if (!cart) {
    return (
      <div className="page">
        <h1>Giỏ hàng</h1>
        <Alert>{error}</Alert>
        {!error && <p className="muted">Đang tải…</p>}
      </div>
    );
  }

  const availableIds = cart.items.filter((i) => i.available).map((i) => i.productId);
  const allChosen = availableIds.length > 0 && availableIds.every((id) => selected.includes(id));

  return (
    <div className="page">
      <div className="page-header">
        <h1>Giỏ hàng</h1>
        <p className="muted">{cart.items.length} sản phẩm · Hàng chưa được giữ cho bạn cho tới khi đặt hàng.</p>
      </div>
      <Alert>{error}</Alert>

      {cart.items.length === 0 ? (
        <div className="card empty-state">
          <span className="empty-icon">
            <CartIcon size={26} />
          </span>
          <p className="muted">Giỏ hàng đang trống.</p>
          <Link to="/products" className="btn btn-primary">
            Xem sản phẩm
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-main">
            <div className="cart-toolbar">
              <label className="bulk-select">
                <input type="checkbox" checked={allChosen} disabled={availableIds.length === 0} onChange={() => setSelected(allChosen ? [] : availableIds)} />
                Chọn tất cả ({availableIds.length})
              </label>
              <div className="bulk-actions">
                {unavailable.length > 0 && (
                  <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => removeMany(unavailable.map((i) => i.productId))}>
                    Bỏ {unavailable.length} món không đặt được
                  </button>
                )}
                {selected.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={busy}
                    onClick={() => window.confirm(`Bỏ ${selected.length} sản phẩm đã chọn khỏi giỏ?`) && removeMany(selected)}
                  >
                    <TrashIcon size={16} /> Xoá đã chọn
                  </button>
                )}
              </div>
            </div>

            {groups.map((group) => {
              const ids = group.items.filter((i) => i.available).map((i) => i.productId);
              const groupChosen = ids.length > 0 && ids.every((id) => selected.includes(id));
              return (
                <section key={group.sellerId ?? 'none'} className="card cart-group">
                  <header className="cart-group-head">
                    <label className="bulk-select">
                      <input type="checkbox" checked={groupChosen} disabled={ids.length === 0} onChange={() => toggle(ids, !groupChosen)} />
                      {group.sellerId ? <Link to={`/sellers/${group.sellerId}`}>{group.sellerName ?? `Người bán #${group.sellerId}`}</Link> : 'Người bán'}
                    </label>
                  </header>
                  <ul className="cart-items">
                    {group.items.map((item) => {
                      const priceChanged = Number(item.price) !== Number(item.priceAtAdd);
                      return (
                        <li key={item.productId} className={`cart-item ${item.available ? '' : 'is-unavailable'}`}>
                          <input
                            type="checkbox"
                            checked={selected.includes(item.productId)}
                            disabled={!item.available}
                            onChange={(e) => toggle([item.productId], e.target.checked)}
                            aria-label={`Chọn ${item.name}`}
                          />
                          <Link to={`/products/${item.productId}`} className="cart-item-thumb">
                            <ProductImage product={item} className="history-thumb" />
                          </Link>
                          <div className="cart-item-info">
                            <Link to={`/products/${item.productId}`}>
                              <strong>{item.name}</strong>
                            </Link>
                            <span className="muted">
                              {[item.category, formatCondition(item.condition)].filter(Boolean).join(' · ')}
                            </span>
                            <span className="cart-item-price">
                              {formatPrice(item.price)}
                              {priceChanged && (
                                <>
                                  <s className="muted">{formatPrice(item.priceAtAdd)}</s>
                                  <span className={`badge ${Number(item.price) < Number(item.priceAtAdd) ? 'badge-success' : 'badge-warning'}`}>
                                    {Number(item.price) < Number(item.priceAtAdd) ? 'Đã giảm giá' : 'Đã tăng giá'}
                                  </span>
                                </>
                              )}
                            </span>
                            {!item.available && <span className="badge badge-danger">{item.unavailableReason}</span>}
                          </div>
                          <QuantityStepper item={item} disabled={busy} onChange={(qty) => setQuantity(item, qty)} />
                          <span className="cart-item-total">{formatPrice(Number(item.price) * item.quantity)}</span>
                          <button type="button" className="icon-btn" onClick={() => remove(item)} disabled={busy} aria-label={`Bỏ ${item.name} khỏi giỏ`} title="Bỏ khỏi giỏ">
                            <TrashIcon />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>

          <aside className="card cart-summary">
            <h2 className="card-title">Tóm tắt</h2>
            <dl>
              <dt>Đã chọn</dt>
              <dd>{chosen.length} sản phẩm</dd>
              <dt>Tạm tính</dt>
              <dd className="product-price product-price-lg">{formatPrice(total)}</dd>
            </dl>
            {sellerCount > 1 && (
              <p className="small-note muted">
                <InfoIcon size={14} /> Hàng của {sellerCount} người bán sẽ được tách thành {sellerCount} đơn, thanh toán từng đơn.
              </p>
            )}
            <button type="button" className="btn btn-primary btn-block" disabled={chosen.length === 0 || busy} onClick={checkout}>
              Đặt hàng ({chosen.length})
            </button>
            <p className="small-note muted">Giá và tồn kho được kiểm tra lại khi đặt. Sau khi đặt có 30 phút để thanh toán.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
