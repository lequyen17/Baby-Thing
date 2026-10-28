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
    quantity,
  };
}

function fromOrder(order) {
  return {
    items: order.items.map((i) => ({
      productId: i.productId,
      name: i.productName,
      sku: i.productSku,
      imageUrl: i.imageUrl,
      price: Number(i.unitPrice),
      // Kho hiện tại đã trừ phần của đơn này, nên không giới hạn được chính xác ở client
      stock: null,
      quantity: i.quantity,
    })),
    shipping: {
      recipientName: order.recipientName,
      phone: order.phone,
      address: order.address,
      note: order.note ?? '',
    },
  };
}

/** Tìm sản phẩm theo tên/SKU để thêm vào đơn. Dùng GET /products (danh sách) nên không tính lượt xem. */
function ProductPicker({ userId, onPick }) {
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
          placeholder="Search products to add"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search products to add"
        />
      </label>
      {results.length > 0 && (
        <ul className="order-picker-results">
          {results.map((p) => {
            // Server cũng chặn (OWN_PRODUCT)
            const own = p.sellerId === userId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className="order-picker-item"
                  onClick={() => onPick(p)}
                  disabled={own || p.stock <= 0}
                  aria-label={`Add ${p.name}`}
                >
                  <ProductImage product={p} className="order-picker-thumb" />
                  <span className="order-picker-name">{p.name}</span>
                  <span className="muted">
                    {own ? 'Your listing' : p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
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
  // Từ trang chi tiết đơn sang thì đã có dữ liệu; từ trang sản phẩm sang ("Order now") thì có sẵn sản phẩm
  const passed = isEdit && state?.order && String(state.order.id) === id ? fromOrder(state.order) : null;

  const [items, setItems] = useState(
    passed?.items ?? (!isEdit && state?.product ? [fromProduct(state.product)] : []),
  );
  const [shipping, setShipping] = useState(
    passed?.shipping ?? { recipientName: user.displayName ?? '', phone: '', address: '', note: '' },
  );
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
        setShipping(data.shipping);
        setLoaded(true);
      })
      .catch((err) => setError(err.message));
  }, [id, loaded, navigate]);

  const addProduct = (product) => {
    setItems((current) => {
      const existing = current.find((i) => i.productId === product.id);
      if (!existing) return [...current, fromProduct(product)];
      return current.map((i) =>
        i.productId === product.id ? { ...i, stock: product.stock, quantity: Math.min(i.quantity + 1, MAX_QUANTITY) } : i,
      );
    });
  };

  const setQuantity = (productId, value) =>
    setItems((current) => current.map((i) => (i.productId === productId ? { ...i, quantity: value } : i)));

  const removeItem = (productId) => setItems((current) => current.filter((i) => i.productId !== productId));

  const updateShipping = (key) => (e) => setShipping({ ...shipping, [key]: e.target.value });

  const total = items.reduce((sum, i) => sum + i.price * (Number(i.quantity) || 0), 0);

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
      navigate(`/orders/${saved.id}`, {
        replace: true,
        state: { notice: isEdit ? 'Order updated.' : 'Order placed successfully.' },
      });
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
        <ArrowLeftIcon size={16} /> {isEdit ? 'Back to order' : 'All orders'}
      </Link>
      <div className="page-header">
        <h1>{isEdit ? `Edit order #${id}` : 'New order'}</h1>
        <p className="muted">
          {isEdit
            ? 'Pending orders can still be changed. Prices are updated to the current price when you save.'
            : 'Stock is reserved as soon as the order is placed.'}
        </p>
      </div>

      <Alert>{error}</Alert>

      {loaded && (
        <form className="order-form" onSubmit={handleSubmit} noValidate>
          <section className="card">
            <h2 className="card-title">Products</h2>
            <ProductPicker userId={user.id} onPick={addProduct} />
            {fieldErrors.items && <small className="field-error">{fieldErrors.items}</small>}

            {items.length === 0 ? (
              <p className="muted order-empty">No products added yet.</p>
            ) : (
              <ul className="order-items">
                {items.map((item) => (
                  <li key={item.productId} className="order-item">
                    <ProductImage product={item} className="history-thumb" />
                    <div className="order-item-info">
                      <strong>{item.name}</strong>
                      <span className="muted">
                        {formatPrice(item.price)}
                        {item.stock !== null && ` · ${item.stock} in stock`}
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
                      aria-label={`Quantity of ${item.name}`}
                    />
                    <span className="order-item-total">{formatPrice(item.price * (Number(item.quantity) || 0))}</span>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => removeItem(item.productId)}
                      aria-label={`Remove ${item.name}`}
                      title="Remove"
                    >
                      <TrashIcon />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="order-total">
              <span>Estimated total</span>
              <span className="product-price product-price-lg">{formatPrice(total)}</span>
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">Shipping</h2>
            <div className="form-grid">
              <Field
                label="Recipient name"
                value={shipping.recipientName}
                onChange={updateShipping('recipientName')}
                maxLength={100}
                required
                error={fieldErrors.recipientName}
              />
              <Field
                label="Phone number"
                type="tel"
                value={shipping.phone}
                onChange={updateShipping('phone')}
                maxLength={20}
                placeholder="e.g. 0901 234 567"
                required
                error={fieldErrors.phone}
              />
            </div>
            <Field
              label="Address"
              value={shipping.address}
              onChange={updateShipping('address')}
              maxLength={500}
              required
              error={fieldErrors.address}
            />
            <Field
              as="textarea"
              label="Note (optional)"
              rows={3}
              value={shipping.note}
              onChange={updateShipping('note')}
              maxLength={1000}
              error={fieldErrors.note}
            />

            <div className="product-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting || items.length === 0}>
                {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Place order'}
              </button>
              <Link to={backTo} className="btn btn-secondary">
                Back
              </Link>
            </div>
          </section>
        </form>
      )}
    </div>
  );
}
