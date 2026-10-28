import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Alert, Field } from '../components/Form';
import { ArrowLeftIcon, PlusIcon, SearchIcon, TrashIcon } from '../components/Icons';
import { ProductImage } from '../components/ProductImage';
import { formatPrice } from '../utils/format';

const MAX_QUANTITY = 999;

function fromProduct(product, quantity = 1) {
  return {
    productId: product.id,
    name: product.name,
    sku: product.sku,
    imageUrl: product.imageUrl,
    price: Number(product.price),
    stock: product.stock,
    sellerId: product.sellerId,
    sellerName: product.sellerName,
    quantity,
  };
}

/**
 * Giống OrderService.update: sản phẩm đã có trong đơn mà giữ hoặc giảm số lượng thì giữ giá lúc đặt,
 * tăng thì tính theo giá hiện tại (item.price, biết được khi chọn lại từ danh sách sản phẩm).
 */
function unitPrice(item, originals) {
  const original = originals[item.productId];
  return original && (Number(item.quantity) || 0) <= original.quantity ? original.price : item.price;
}

function fromOrder(order) {
  return {
    items: order.items.map((i) => ({
      productId: i.productId,
      name: i.productName,
      sku: i.productSku,
      imageUrl: i.imageUrl,
      price: Number(i.unitPrice),
      // Chưa biết kho hiện tại; chọn lại sản phẩm từ danh sách thì mới có
      stock: null,
      sellerId: order.seller?.id ?? null,
      sellerName: order.seller?.displayName ?? null,
      quantity: i.quantity,
    })),
    sellerId: order.seller?.id ?? null,
    buyerId: order.customer.id,
    originals: Object.fromEntries(
      order.items.map((i) => [i.productId, { price: Number(i.unitPrice), quantity: i.quantity }]),
    ),
    shipping: {
      recipientName: order.recipientName,
      phone: order.phone,
      address: order.address,
      note: order.note ?? '',
    },
  };
}

/**
 * Tìm sản phẩm theo tên/SKU để thêm vào đơn. Dùng GET /products (danh sách) nên không tính lượt xem.
 * buyerId: người mua của đơn (admin sửa đơn của người khác thì khác user đang đăng nhập).
 * onlySellerId: khi sửa đơn, chỉ thêm được hàng của người bán của đơn đó.
 * originals: dòng hàng của đơn đang sửa; phần đó vẫn chọn lại được dù kho hiện tại đã hết.
 */
function ProductPicker({ buyerId, onlySellerId, originals, onPick }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      const query = new URLSearchParams({ status: 'ACTIVE', size: '8' });
      if (q.trim()) query.set('q', q.trim());
      api(`/products?${query}`)
        .then((data) => !cancelled && setResults(data.items))
        .catch(() => !cancelled && setResults([]));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  return (
    <div className="order-picker">
      <label className="search-box">
        <SearchIcon />
        <input
          type="search"
          placeholder="Tìm sản phẩm để thêm vào đơn"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Tìm sản phẩm để thêm vào đơn"
        />
      </label>
      {results.length > 0 && (
        <ul className="order-picker-results">
          {results.map((p) => {
            // Server cũng chặn (OWN_PRODUCT, DIFFERENT_SELLER)
            const own = p.sellerId === buyerId;
            const otherSeller = onlySellerId !== undefined && p.sellerId !== onlySellerId;
            const available = p.stock + (originals[p.id]?.quantity ?? 0);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className="order-picker-item"
                  onClick={() => onPick(p)}
                  disabled={own || otherSeller || available <= 0}
                  aria-label={`Thêm ${p.name}`}
                >
                  <ProductImage product={p} className="order-picker-thumb" />
                  <span className="order-picker-name">{p.name}</span>
                  <span className="muted">
                    {own
                      ? 'Tin của bạn'
                      : otherSeller
                        ? 'Người bán khác'
                        : available > 0
                          ? `Còn ${available}`
                          : 'Hết hàng'}
                  </span>
                  <span className="product-price">{formatPrice(p.price)}</span>
                  <PlusIcon size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Tạo đơn (/orders/new) và sửa đơn còn PENDING (/orders/:id/edit). */
export default function OrderFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state } = useLocation();
  // Từ trang chi tiết đơn sang thì đã có dữ liệu; từ trang sản phẩm sang ("Đặt mua ngay") thì có sẵn sản phẩm
  const passed = isEdit && state?.order && String(state.order.id) === id ? fromOrder(state.order) : null;

  const [items, setItems] = useState(
    passed?.items ?? (!isEdit && state?.product ? [fromProduct(state.product)] : []),
  );
  const [shipping, setShipping] = useState(
    passed?.shipping ?? { recipientName: user.displayName ?? '', phone: '', address: '', note: '' },
  );
  // Người bán của đơn đang sửa; undefined = tạo mới, hàng của ai cũng được
  const [orderSellerId, setOrderSellerId] = useState(passed ? passed.sellerId : undefined);
  const [buyerId, setBuyerId] = useState(passed ? passed.buyerId : user.id);
  // Dòng hàng lúc mở form sửa: { [productId]: { price, quantity } }
  const [originals, setOriginals] = useState(passed?.originals ?? {});
  const [loaded, setLoaded] = useState(!isEdit || Boolean(passed));
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loaded) return;
    api(`/orders/${id}`)
      .then((order) => {
        if (order.status !== 'PENDING') {
          navigate(`/orders/${id}`, { replace: true });
          return;
        }
        const data = fromOrder(order);
        setItems(data.items);
        setOrderSellerId(data.sellerId);
        setBuyerId(data.buyerId);
        setOriginals(data.originals);
        setShipping(data.shipping);
        setLoaded(true);
      })
      .catch((err) => setError(err.message));
  }, [id, loaded, navigate]);

  const addProduct = (product) => {
    // Kho hiện tại đã trừ phần của đơn đang sửa; server hoàn phần đó trước khi trừ lại
    const fresh = { ...fromProduct(product), stock: product.stock + (originals[product.id]?.quantity ?? 0) };
    setItems((current) => {
      const existing = current.find((i) => i.productId === product.id);
      if (!existing) return [...current, fresh];
      return current.map((i) =>
        i.productId === product.id
          ? { ...i, price: fresh.price, stock: fresh.stock, quantity: Math.min(Number(i.quantity) + 1, MAX_QUANTITY) }
          : i,
      );
    });
  };

  const setQuantity = (productId, value) =>
    setItems((current) => current.map((i) => (i.productId === productId ? { ...i, quantity: value } : i)));

  const removeItem = (productId) => setItems((current) => current.filter((i) => i.productId !== productId));

  const updateShipping = (key) => (e) => setShipping({ ...shipping, [key]: e.target.value });

  const total = items.reduce((sum, i) => sum + unitPrice(i, originals) * (Number(i.quantity) || 0), 0);
  // Server tách một đơn cho mỗi người bán
  const sellerCount = new Set(items.map((i) => i.sellerId)).size;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setSubmitting(true);
    try {
      const body = {
        ...shipping,
        items: items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity) || null })),
      };
      const saved = await api(isEdit ? `/orders/${id}` : '/orders', { method: isEdit ? 'PUT' : 'POST', body });
      if (isEdit) {
        navigate(`/orders/${saved.id}`, { replace: true, state: { notice: 'Đã cập nhật đơn hàng.' } });
      } else if (saved.length === 1) {
        navigate(`/orders/${saved[0].id}`, { replace: true, state: { notice: 'Đặt hàng thành công.' } });
      } else {
        const ids = saved.map((o) => `#${o.id}`).join(', ');
        navigate('/orders', {
          replace: true,
          state: { notice: `Đã tạo ${saved.length} đơn, mỗi người bán một đơn: ${ids}.` },
        });
      }
    } catch (err) {
      const fields = err.fields || {};
      // Lỗi từng dòng hàng (items[0].quantity) gộp vào thông báo chung
      const itemError = Object.entries(fields).find(([key]) => key.startsWith('items'))?.[1];
      setError(itemError ? `${err.message}: ${itemError}` : err.message);
      setFieldErrors(fields);
      setSubmitting(false);
    }
  };

  const backTo = isEdit ? `/orders/${id}` : '/orders';

  return (
    <div className="page">
      <Link to={backTo} className="back-link">
        <ArrowLeftIcon size={16} /> {isEdit ? 'Quay lại đơn hàng' : 'Tất cả đơn hàng'}
      </Link>
      <div className="page-header">
        <h1>{isEdit ? `Sửa đơn #${id}` : 'Tạo đơn mới'}</h1>
        <p className="muted">
          {isEdit
            ? 'Đơn đang chờ xác nhận thì vẫn sửa được. Sản phẩm giữ nguyên hoặc giảm số lượng thì giữ giá lúc đặt; sản phẩm mới hoặc tăng số lượng thì tính theo giá hiện tại.'
            : 'Hàng được giữ cho bạn ngay khi đặt đơn.'}
        </p>
      </div>

      <Alert>{error}</Alert>

      {loaded && (
        <form className="order-form" onSubmit={handleSubmit} noValidate>
          <section className="card">
            <h2 className="card-title">Sản phẩm</h2>
            <ProductPicker buyerId={buyerId} onlySellerId={orderSellerId} originals={originals} onPick={addProduct} />
            {!isEdit && sellerCount > 1 && (
              <p className="muted">
                Các sản phẩm này đến từ {sellerCount} người bán, nên sẽ được tách thành {sellerCount} đơn riêng.
              </p>
            )}
            {fieldErrors.items && <small className="field-error">{fieldErrors.items}</small>}

            {items.length === 0 ? (
              <p className="muted order-empty">Chưa có sản phẩm nào.</p>
            ) : (
              <ul className="order-items">
                {items.map((item) => (
                  <li key={item.productId} className="order-item">
                    <ProductImage product={item} className="history-thumb" />
                    <div className="order-item-info">
                      <strong>{item.name}</strong>
                      <span className="muted">
                        {formatPrice(unitPrice(item, originals))}
                        {item.stock !== null && ` · Còn ${item.stock}`}
                        {item.sellerName && ` · Người bán: ${item.sellerName}`}
                      </span>
                    </div>
                    <input
                      type="number"
                      className="order-qty"
                      min="1"
                      max={item.stock ?? MAX_QUANTITY}
                      step="1"
                      value={item.quantity}
                      onChange={(e) => setQuantity(item.productId, e.target.value)}
                      aria-label={`Số lượng ${item.name}`}
                    />
                    <span className="order-item-total">{formatPrice(unitPrice(item, originals) * (Number(item.quantity) || 0))}</span>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => removeItem(item.productId)}
                      aria-label={`Bỏ ${item.name} khỏi đơn`}
                      title="Bỏ khỏi đơn"
                    >
                      <TrashIcon />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="order-total">
              <span>Tạm tính</span>
              <span className="product-price product-price-lg">{formatPrice(total)}</span>
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">Thông tin giao hàng</h2>
            <div className="form-grid">
              <Field
                label="Tên người nhận"
                value={shipping.recipientName}
                onChange={updateShipping('recipientName')}
                maxLength={100}
                required
                error={fieldErrors.recipientName}
              />
              <Field
                label="Số điện thoại"
                type="tel"
                value={shipping.phone}
                onChange={updateShipping('phone')}
                maxLength={20}
                placeholder="VD: 0901 234 567"
                required
                error={fieldErrors.phone}
              />
            </div>
            <Field
              label="Địa chỉ"
              value={shipping.address}
              onChange={updateShipping('address')}
              maxLength={500}
              required
              error={fieldErrors.address}
            />
            <Field
              as="textarea"
              label="Ghi chú (không bắt buộc)"
              rows={3}
              value={shipping.note}
              onChange={updateShipping('note')}
              maxLength={1000}
              error={fieldErrors.note}
            />

            <div className="product-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting || items.length === 0}>
                {submitting ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Đặt hàng'}
              </button>
              <Link to={backTo} className="btn btn-secondary">
                Quay lại
              </Link>
            </div>
          </section>
        </form>
      )}
    </div>
  );
}
