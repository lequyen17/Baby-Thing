import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Alert } from '../components/Form';
import { ArrowLeftIcon, CardIcon, CheckIcon, ClockIcon, EditIcon, TruckIcon, XCircleIcon } from '../components/Icons';
import { OrderStatusBadge, orderPermissions, STEPS } from '../components/OrderStatus';
import { ProductImage } from '../components/ProductImage';
import { ListingSpecs } from '../components/ListingSpecs';
import { formatDate, formatPrice } from '../utils/format';

/** Thanh tiến trình kèm thời điểm từng bước; đơn đã huỷ thì không hiện. */
function OrderProgress({ order }) {
  const current = STEPS.findIndex(([status]) => status === order.status);
  return (
    <ol className="order-progress">
      {STEPS.map(([status, timeKey, label], index) => (
        <li key={status} className={index <= current ? 'is-done' : ''} aria-current={index === current ? 'step' : undefined}>
          <span className="order-progress-dot" />
          {label}
          {index <= current && order[timeKey] && <small className="order-progress-time">{formatDate(order[timeKey])}</small>}
        </li>
      ))}
    </ol>
  );
}

/** Gợi ý việc cần làm tiếp theo cho người đang xem. */
function NextHint({ order, perms }) {
  const { status } = order;
  let text = null;
  if (order.care && perms.isSeller && !['COMPLETED', 'CANCELLED'].includes(status)) {
    text = 'Đơn hàng ký gửi Care: Baby Things xác nhận, đóng gói và giao hàng giúp bạn. Hoàn tất thì tiền bán (đã trừ hoa hồng) được ghi nhận vào Doanh thu.';
  } else if (status === 'AWAITING_PAYMENT') {
    text = perms.isBuyer
      ? `Thanh toán trước ${formatDate(order.paymentDueAt)} để giữ hàng; quá hạn đơn sẽ tự huỷ.`
      : `Người mua chưa thanh toán (hạn ${formatDate(order.paymentDueAt)}).`;
  } else if (status === 'PENDING') {
    text = perms.isBuyer ? 'Đã thanh toán. Người bán sẽ xác nhận đơn trong 24 giờ.' : 'Người mua đã thanh toán. Vui lòng xác nhận đơn trong 24 giờ.';
  } else if (status === 'CONFIRMED') {
    text = perms.isBuyer ? 'Người bán đang đóng gói.' : 'Đóng gói và giao cho đơn vị vận chuyển, nhập mã vận đơn khi giao.';
  } else if (status === 'SHIPPING') {
    text = `Đơn đang được vận chuyển${order.trackingCode ? `, mã vận đơn ${order.trackingCode}` : ''}.`;
  } else if (status === 'DELIVERED') {
    text = perms.isBuyer
      ? `Kiểm tra hàng, đối chiếu với bản chụp tin đăng bên dưới rồi xác nhận trước ${formatDate(order.inspectionEndsAt)}. Hết hạn, đơn tự hoàn tất.`
      : `Chờ người mua kiểm hàng (đến ${formatDate(order.inspectionEndsAt)}). Hoàn tất thì tiền bán hàng được ghi nhận để chi trả.`;
  } else if (status === 'COMPLETED') {
    text = perms.isSeller ? (
      <>
        Đơn đã hoàn tất. Tiền bán hàng (đã trừ hoa hồng) được chi trả theo kỳ, xem tại <Link to="/sales">Doanh thu</Link>.
      </>
    ) : (
      'Đơn đã hoàn tất. Cảm ơn bạn đã mua sắm tại Baby Things!'
    );
  }
  if (!text) return null;
  return (
    <p className="order-hint">
      <ClockIcon size={16} /> <span>{text}</span>
    </p>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(location.state?.noticeType === 'error' ? location.state.notice : '');
  const [notice, setNotice] = useState(location.state?.noticeType === 'error' ? '' : (location.state?.notice ?? ''));
  const [busy, setBusy] = useState(false);
  const [tracking, setTracking] = useState('');

  useEffect(() => {
    setOrder(null);
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
    const refund = order.paidAt ? ' Tiền đã thanh toán sẽ được hoàn cho người mua.' : '';
    const reason = window.prompt(`Huỷ đơn #${order.id}?${refund} Bạn có thể ghi lý do (không bắt buộc):`, '');
    if (reason === null) return;
    run(() => api(`/orders/${id}/cancel`, { method: 'POST', body: { reason } }), `Đã huỷ đơn hàng.${refund}`);
  };

  const handleNextStep = (step) => {
    if (step.needsTracking && !tracking.trim()) {
      setError('Vui lòng nhập mã vận đơn trước khi giao cho đơn vị vận chuyển.');
      return;
    }
    run(
      () =>
        api(`/orders/${id}/status`, {
          method: 'PATCH',
          body: { status: step.status, trackingCode: step.needsTracking ? tracking.trim() : undefined },
        }),
      `Đã cập nhật đơn hàng: ${step.label.toLowerCase()}.`,
    );
  };

  const handleReceive = () => {
    if (!window.confirm('Xác nhận bạn đã nhận hàng đúng mô tả? Sau khi xác nhận, tiền sẽ được chuyển cho người bán.')) return;
    run(() => api(`/orders/${id}/receive`, { method: 'POST' }), 'Cảm ơn bạn! Đơn hàng đã hoàn tất.');
  };

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
                {order.care && <span className="badge badge-renewed">Care · Renewed</span>}
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
              {perms.canPay && (
                <Link to={`/orders/${order.id}/pay`} className="btn btn-primary">
                  <CardIcon /> Thanh toán
                </Link>
              )}
              {perms.canReceive && (
                <button type="button" className="btn btn-primary" onClick={handleReceive} disabled={busy}>
                  <CheckIcon /> Đã nhận hàng
                </button>
              )}
              {perms.nextStep && !perms.nextStep.needsTracking && (
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

          {perms.nextStep?.needsTracking && (
            <form
              className="card ship-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleNextStep(perms.nextStep);
              }}
            >
              <TruckIcon size={22} />
              <label className="field">
                <span>Mã vận đơn (GHN, GHTK, Ahamove…)</span>
                <input value={tracking} onChange={(e) => setTracking(e.target.value)} maxLength={50} placeholder="VD: GHN123456789" />
              </label>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {perms.nextStep.label}
              </button>
            </form>
          )}

          {order.status === 'CANCELLED' ? (
            <div className="card order-cancelled">
              <strong>Đã huỷ lúc {formatDate(order.cancelledAt)}</strong>
              {order.cancelReason && <p className="muted">Lý do: {order.cancelReason}</p>}
              {order.paidAt && <p className="muted">Khoản thanh toán của đơn đã được hoàn lại cho người mua.</p>}
            </div>
          ) : (
            <section className="card">
              <OrderProgress order={order} />
              <NextHint order={order} perms={perms} />
            </section>
          )}

          <div className="order-detail-grid">
            <section className="card">
              <h2 className="card-title">Sản phẩm</h2>
              <ul className="order-items">
                {order.items.map((item) => (
                  <li key={item.id} className="order-item-block">
                    <div className="order-item">
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
                    </div>
                    {item.snapshot && (
                      <details className="snapshot">
                        <summary>Bản chụp tin đăng lúc mua</summary>
                        <ListingSpecs item={item.snapshot} />
                        {item.snapshot.description && <p className="product-description">{item.snapshot.description}</p>}
                        {item.snapshot.imageUrls?.length > 0 && (
                          <div className="gallery-thumbs">
                            {item.snapshot.imageUrls.map((url) => (
                              <a key={url} href={url} target="_blank" rel="noreferrer">
                                <img src={url} alt="" loading="lazy" />
                              </a>
                            ))}
                          </div>
                        )}
                      </details>
                    )}
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
                {order.trackingCode && (
                  <>
                    <dt>Mã vận đơn</dt>
                    <dd>{order.trackingCode}</dd>
                  </>
                )}
                <dt>Thanh toán</dt>
                <dd>{order.paidAt ? `Đã thanh toán online lúc ${formatDate(order.paidAt)}` : 'Chưa thanh toán'}</dd>
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
