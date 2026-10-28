import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Alert } from '../components/Form';
import { ArrowLeftIcon, CardIcon, ClockIcon, ShieldCheckIcon } from '../components/Icons';
import { PAYMENT_METHODS } from '../components/PaymentStatus';
import { ProductImage } from '../components/ProductImage';
import { formatDate, formatPrice } from '../utils/format';

/** Chọn hình thức rồi chuyển sang cổng thanh toán (/orders/:id/pay). Chỉ người mua, đơn đang chờ thanh toán. */
export default function CheckoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [method, setMethod] = useState('QR');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api(`/orders/${id}`)
      .then((data) => {
        if (data.status !== 'AWAITING_PAYMENT') {
          navigate(`/orders/${id}`, { replace: true });
          return;
        }
        setOrder(data);
      })
      .catch((err) => setError(err.message));
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { checkoutUrl } = await api('/payments', { method: 'POST', body: { orderId: Number(id), method } });
      // Cổng thật trả URL tuyệt đối của đối tác; cổng giả lập là trang trong app
      if (/^https?:\/\//.test(checkoutUrl)) window.location.assign(checkoutUrl);
      else navigate(checkoutUrl);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="page page-narrow">
      <Link to={`/orders/${id}`} className="back-link">
        <ArrowLeftIcon size={16} /> Quay lại đơn hàng
      </Link>
      <div className="page-header">
        <h1>Thanh toán đơn #{id}</h1>
        {order?.paymentDueAt && (
          <p className="muted">
            <ClockIcon size={14} /> Hàng được giữ đến {formatDate(order.paymentDueAt)}. Quá hạn, đơn sẽ tự huỷ.
          </p>
        )}
      </div>
      <Alert>{error}</Alert>
      {!order && !error && <p className="muted">Đang tải…</p>}

      {order && (
        <form className="checkout" onSubmit={handleSubmit}>
          <section className="card">
            <h2 className="card-title">Đơn hàng</h2>
            <ul className="order-items">
              {order.items.map((item) => (
                <li key={item.id} className="order-item">
                  <ProductImage product={{ imageUrl: item.imageUrl, name: item.productName }} className="history-thumb" />
                  <div className="order-item-info">
                    <strong>{item.productName}</strong>
                    <span className="muted">
                      {formatPrice(item.unitPrice)} × {item.quantity}
                    </span>
                  </div>
                  <span className="order-item-total">{formatPrice(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <p className="muted">
              Người bán: {order.seller?.displayName ?? '—'} · Giao đến {order.recipientName}, {order.address}
            </p>
            <div className="order-total">
              <span>Tổng thanh toán</span>
              <span className="product-price product-price-lg">{formatPrice(order.totalAmount)}</span>
            </div>
            <p className="muted small-note">Phí giao hàng thanh toán trực tiếp với đơn vị vận chuyển khi nhận hàng.</p>
          </section>

          <section className="card">
            <h2 className="card-title">Hình thức thanh toán</h2>
            <div className="choice-list" role="radiogroup">
              {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                <label key={value} className={`choice ${method === value ? 'is-active' : ''}`}>
                  <input type="radio" name="method" value={value} checked={method === value} onChange={() => setMethod(value)} />
                  <CardIcon size={18} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <p className="muted small-note">
              <ShieldCheckIcon size={14} /> Tiền được thu qua đối tác thanh toán. Người bán chỉ nhận tiền sau khi bạn xác nhận đã
              nhận hàng đúng mô tả; huỷ trước khi người bán xác nhận sẽ được hoàn tiền.
            </p>
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Đang chuyển sang cổng thanh toán…' : `Thanh toán ${formatPrice(order.totalAmount)}`}
            </button>
          </section>
        </form>
      )}
    </div>
  );
}
