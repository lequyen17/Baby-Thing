import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Alert } from '../components/Form';
import { ArrowLeftIcon, EditIcon, XCircleIcon } from '../components/Icons';
import { OrderStatusBadge, ORDER_STATUSES, orderPermissions, STEPS } from '../components/OrderStatus';
import { ProductImage } from '../components/ProductImage';
import { formatDate, formatPrice } from '../utils/format';

/** Thanh tiến trình PENDING → DELIVERED; đơn đã huỷ thì không hiện. */
function OrderProgress({ status }) {
  const current = STEPS.indexOf(status);
  return (
    <ol className="order-progress">
      {STEPS.map((step, index) => (
        <li key={step} className={index <= current ? 'is-done' : ''} aria-current={index === current ? 'step' : undefined}>
          <span className="order-progress-dot" />
          {ORDER_STATUSES[step].label}
        </li>
      ))}
    </ol>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOrder(null);
    setError('');
    api(`/orders/${id}`)
      .then(setOrder)
      .catch((err) => setError(err.message));
  }, [id]);

  const run = async (request, message) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      setOrder(await request());
      setNotice(message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    const reason = window.prompt(`Huỷ đơn #${order.id}? Bạn có thể ghi lý do (không bắt buộc):`, '');
    if (reason === null) return;
    run(() => api(`/orders/${id}/cancel`, { method: 'POST', body: { reason } }), 'Đã huỷ đơn hàng.');
  };

  const handleNextStep = (step) =>
    run(
      () => api(`/orders/${id}/status`, { method: 'PATCH', body: { status: step.status } }),
      `Đơn hàng đã chuyển sang "${ORDER_STATUSES[step.status].label}".`,
    );

  const perms = order ? orderPermissions(order, user) : null;

  return (
    <div className="page">
      <Link to={perms?.isSeller ? '/orders?view=selling' : '/orders'} className="back-link">
        <ArrowLeftIcon size={16} /> Tất cả đơn hàng
      </Link>
      <Alert type="success">{notice}</Alert>
      <Alert>{error}</Alert>
      {!order && !error && <p className="muted">Đang tải…</p>}

      {order && (
        <>
          <div className="page-header page-header-row">
            <div>
              <h1 className="order-title">
                Đơn #{order.id} <OrderStatusBadge status={order.status} />
              </h1>
              <p className="muted">
                Đặt lúc {formatDate(order.createdAt)} · Cập nhật {formatDate(order.updatedAt)}
                {order.seller && !perms.isSeller && (
                  <>
                    {' · Người bán: '}
                    <Link to={`/sellers/${order.seller.id}`}>{order.seller.displayName}</Link>
                  </>
                )}
              </p>
            </div>
            <div className="product-actions order-actions">
              {perms.nextStep && (
                <button type="button" className="btn btn-primary" onClick={() => handleNextStep(perms.nextStep)} disabled={busy}>
                  {perms.nextStep.label}
                </button>
              )}
              {perms.canEdit && (
                <Link to={`/orders/${order.id}/edit`} state={{ order }} className="btn btn-secondary">
                  <EditIcon /> Sửa đơn
                </Link>
              )}
              {perms.canCancel && (
                <button type="button" className="btn btn-danger" onClick={handleCancel} disabled={busy}>
                  <XCircleIcon /> Huỷ đơn
                </button>
              )}
            </div>
          </div>

          {order.status === 'CANCELLED' ? (
            <div className="card order-cancelled">
              <strong>Đã huỷ lúc {formatDate(order.cancelledAt)}</strong>
              {order.cancelReason && <p className="muted">Lý do: {order.cancelReason}</p>}
            </div>
          ) : (
            <section className="card">
              <OrderProgress status={order.status} />
            </section>
          )}

          <div className="order-detail-grid">
            <section className="card">
              <h2 className="card-title">Sản phẩm</h2>
              <ul className="order-items">
                {order.items.map((item) => (
                  <li key={item.id} className="order-item">
                    <ProductImage product={{ imageUrl: item.imageUrl, name: item.productName }} className="history-thumb" />
                    <div className="order-item-info">
                      <Link to={`/products/${item.productId}`}>
                        <strong>{item.productName}</strong>
                      </Link>
                      <span className="muted">SKU: {item.productSku}</span>
                      <span className="muted">
                        {formatPrice(item.unitPrice)} × {item.quantity}
                      </span>
                    </div>
                    <span className="order-item-total">{formatPrice(item.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="order-total">
                <span>Tổng tiền</span>
                <span className="product-price product-price-lg">{formatPrice(order.totalAmount)}</span>
              </div>
            </section>

            <section className="card">
              <h2 className="card-title">Giao hàng</h2>
              <dl className="order-shipping">
                <dt>Người nhận</dt>
                <dd>{order.recipientName}</dd>
                <dt>Số điện thoại</dt>
                <dd>{order.phone}</dd>
                <dt>Địa chỉ</dt>
                <dd>{order.address}</dd>
                {order.note && (
                  <>
                    <dt>Ghi chú</dt>
                    <dd>{order.note}</dd>
                  </>
                )}
                {!perms.isBuyer && (
                  <>
                    <dt>Người mua</dt>
                    <dd>
                      {order.customer.displayName}
                      {/* Server chỉ trả email cho admin */}
                      {order.customer.email && (
                        <>
                          <br />
                          <span className="muted">{order.customer.email}</span>
                        </>
                      )}
                    </dd>
                  </>
                )}
              </dl>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
