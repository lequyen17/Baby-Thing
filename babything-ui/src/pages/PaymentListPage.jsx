import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Alert } from '../components/Form';
import { SearchIcon } from '../components/Icons';
import { Pagination } from '../components/Pagination';
import { PAYMENT_METHODS, PAYMENT_STATUSES, PaymentStatusBadge } from '../components/PaymentStatus';
import { ProductImage } from '../components/ProductImage';
import { formatDate, formatPrice } from '../utils/format';

const PAGE_SIZE = 10;

const SORTS = [
  ['newest', 'Mới nhất'],
  ['oldest', 'Cũ nhất'],
  ['amount_desc', 'Số tiền: cao đến thấp'],
  ['amount_asc', 'Số tiền: thấp đến cao'],
];

function orderSummary(order) {
  if (!order.firstItemName) return `Đơn #${order.id}`;
  return order.itemCount > 1 ? `${order.firstItemName} và ${order.itemCount - 1} sản phẩm khác` : order.firstItemName;
}

/** Thời điểm đáng chú ý nhất của giao dịch theo trạng thái. */
function paymentTime(payment) {
  if (payment.status === 'PAID') return `Thanh toán lúc ${formatDate(payment.paidAt)}`;
  if (payment.status === 'REFUNDED') return `Hoàn tiền lúc ${formatDate(payment.refundedAt)}`;
  if (payment.status === 'PENDING' && payment.expiresAt) return `Hết hạn lúc ${formatDate(payment.expiresAt)}`;
  return `Tạo lúc ${formatDate(payment.createdAt)}`;
}

function Stat({ value, label }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

/** Lịch sử thanh toán của chính mình. Bộ lọc nằm trên URL giống trang đơn hàng. */
export default function PaymentListPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const method = params.get('method') ?? '';
  const sort = params.get('sort') ?? 'newest';
  const page = Number(params.get('page') ?? 0) || 0;

  const [search, setSearch] = useState(q);
  const [result, setResult] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => setSearch(q), [q]);

  useEffect(() => {
    api('/payments/summary')
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ sort, page: String(page), size: String(PAGE_SIZE) });
    if (q) query.set('q', q);
    if (status) query.set('status', status);
    if (method) query.set('method', method);
    setError('');
    api(`/payments?${query}`)
      .then((data) => !cancelled && setResult(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [q, status, method, sort, page]);

  const updateParams = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateParams({ q: search.trim() });
  };

  const filtered = Boolean(q || status || method);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Thanh toán của tôi</h1>
        <p className="muted">{result ? `${result.totalItems} giao dịch` : 'Đang tải…'}</p>
      </div>

      <section className="stat-grid payment-stats">
        <Stat value={summary ? formatPrice(summary.totalPaid) : '…'} label="Đã thanh toán" />
        <Stat value={summary?.paidCount ?? '…'} label="Giao dịch thành công" />
        <Stat value={summary?.pendingCount ?? '…'} label="Đang chờ thanh toán" />
        <Stat value={summary ? formatPrice(summary.totalRefunded) : '…'} label="Đã được hoàn tiền" />
      </section>

      <form className="card product-toolbar" onSubmit={handleSearch} role="search">
        <label className="search-box">
          <SearchIcon />
          <input
            type="search"
            placeholder="Mã đơn (#12) hoặc mã giao dịch"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tìm giao dịch"
          />
        </label>
        <select value={status} onChange={(e) => updateParams({ status: e.target.value })} aria-label="Trạng thái">
          <option value="">Mọi trạng thái</option>
          {Object.entries(PAYMENT_STATUSES).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select value={method} onChange={(e) => updateParams({ method: e.target.value })} aria-label="Hình thức">
          <option value="">Mọi hình thức</option>
          {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => updateParams({ sort: e.target.value })} aria-label="Sắp xếp">
          {SORTS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary">
          Tìm kiếm
        </button>
      </form>

      <Alert>{error}</Alert>

      {result && result.items.length === 0 && (
        <div className="card empty-state">
          <p className="muted">
            {filtered ? (
              'Không có giao dịch nào phù hợp bộ lọc.'
            ) : (
              <>
                Bạn chưa có giao dịch thanh toán nào. <Link to="/orders">Xem đơn hàng</Link>
              </>
            )}
          </p>
        </div>
      )}

      {result && result.items.length > 0 && (
        <ul className="card order-list">
          {result.items.map((payment) => (
            <li key={payment.id}>
              <Link to={`/orders/${payment.order.id}`} className="order-row">
                <ProductImage
                  product={{ imageUrl: payment.order.firstItemImageUrl, name: payment.order.firstItemName }}
                  className="history-thumb"
                />
                <div className="order-row-info">
                  <div className="order-row-title">
                    <strong>Đơn #{payment.order.id}</strong>
                    <PaymentStatusBadge status={payment.status} />
                  </div>
                  <span className="order-row-items">{orderSummary(payment.order)}</span>
                  <span className="muted order-row-meta">
                    {PAYMENT_METHODS[payment.method] ?? payment.method} · Mã GD {payment.transactionRef} · {paymentTime(payment)}
                    {payment.order.seller && ` · Người bán: ${payment.order.seller.displayName}`}
                  </span>
                  {payment.status === 'FAILED' && payment.failureReason && (
                    <span className="order-row-meta payment-failure">{payment.failureReason}</span>
                  )}
                </div>
                <span className="product-price order-row-total">{formatPrice(payment.amount)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {result && (
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          onChange={(p) => updateParams({ page: p > 0 ? String(p) : '' })}
        />
      )}
    </div>
  );
}
