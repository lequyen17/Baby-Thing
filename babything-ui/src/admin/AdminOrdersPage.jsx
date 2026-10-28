import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Alert } from '../components/Form';
import { ClockIcon, SearchIcon } from '../components/Icons';
import { ORDER_STATUSES, OrderStatusBadge } from '../components/OrderStatus';
import { Pagination } from '../components/Pagination';
import { ProductImage } from '../components/ProductImage';
import { formatDate, formatPrice } from '../utils/format';

const PAGE_SIZE = 20;

const SORTS = [
  ['newest', 'Mới nhất'],
  ['oldest', 'Cũ nhất'],
  ['total_desc', 'Tổng tiền: cao đến thấp'],
  ['total_asc', 'Tổng tiền: thấp đến cao'],
];

/** Khớp OrderService.ATTENTIONS. */
const ATTENTIONS = {
  slow_confirm: ['Chờ xác nhận quá 24 giờ', 'Người mua đã trả tiền nhưng người bán chưa xác nhận'],
  slow_ship: ['Chưa giao quá 48 giờ', 'Người bán đã xác nhận nhưng chưa giao cho vận chuyển'],
  inspection_ending: ['Sắp hết hạn kiểm hàng', 'Dưới 12 giờ nữa đơn tự hoàn tất và ghi nhận tiền cho người bán'],
};

const FILTER_KEYS = ['q', 'status', 'seller', 'from', 'to', 'attention', 'sort'];

function paymentState(order) {
  if (order.status === 'AWAITING_PAYMENT') return ['Chưa thanh toán', 'badge-warning'];
  if (order.status === 'CANCELLED') return order.paidAt ? ['Đã hoàn tiền', 'badge-muted'] : ['Không thanh toán', 'badge-muted'];
  return order.paidAt ? ['Đã thanh toán', 'badge-success'] : ['—', 'badge-muted'];
}

/** Mốc thời gian quan trọng nhất của đơn ở trạng thái hiện tại. */
function milestone(order) {
  switch (order.status) {
    case 'AWAITING_PAYMENT':
      return `Hạn trả ${formatDate(order.paymentDueAt)}`;
    case 'PENDING':
      return `Đã trả ${formatDate(order.paidAt)}`;
    case 'CONFIRMED':
      return `Xác nhận ${formatDate(order.confirmedAt)}`;
    case 'SHIPPING':
      return `Mã vận đơn ${order.trackingCode ?? '—'}`;
    case 'DELIVERED':
      return `Hết hạn kiểm ${formatDate(order.inspectionEndsAt)}`;
    case 'COMPLETED':
      return `Hoàn tất ${formatDate(order.completedAt)}`;
    case 'CANCELLED':
      return order.cancelReason ? `Huỷ: ${order.cancelReason}` : 'Đã huỷ';
    default:
      return '';
  }
}

/** Quản trị đơn: thống kê theo trạng thái, đơn cần chú ý, lọc theo người bán / khoảng ngày. */
export default function AdminOrdersPage() {
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? '']));
  const page = Number(params.get('page') ?? 0) || 0;
  const [form, setForm] = useState({ q: filters.q, seller: filters.seller });
  const [stats, setStats] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => setForm({ q: filters.q, seller: filters.seller }), [filters.q, filters.seller]);

  useEffect(() => {
    api('/admin/orders/stats')
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const queryKey = params.toString();
  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    FILTER_KEYS.forEach((k) => filters[k] && query.set(k, filters[k]));
    setError('');
    api(`/admin/orders?${query}`)
      .then((data) => !cancelled && setResult(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
    // filters suy ra từ params; queryKey đổi khi bất kỳ tham số nào đổi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const updateParams = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const hasFilter = FILTER_KEYS.some((k) => k !== 'sort' && filters[k]);
  const totalOrders = stats ? Object.values(stats.byStatus).reduce((sum, s) => sum + s.count, 0) : null;

  return (
    <>
      <div className="status-chips" role="tablist" aria-label="Lọc theo trạng thái">
        <button
          type="button"
          role="tab"
          aria-selected={!filters.status}
          className={!filters.status ? 'is-active' : undefined}
          onClick={() => updateParams({ status: '' })}
        >
          <span>Tất cả</span>
          <strong>{totalOrders ?? '…'}</strong>
        </button>
        {Object.entries(ORDER_STATUSES).map(([value, { label }]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filters.status === value}
            className={filters.status === value ? 'is-active' : undefined}
            onClick={() => updateParams({ status: value, attention: '' })}
          >
            <span>{label}</span>
            <strong>{stats ? stats.byStatus[value]?.count ?? 0 : '…'}</strong>
            {stats && stats.byStatus[value]?.count > 0 && <small>{formatPrice(stats.byStatus[value].amount)}</small>}
          </button>
        ))}
      </div>

      {stats && (
        <div className="attention-grid">
          {Object.entries(ATTENTIONS).map(([key, [label, hint]]) => {
            const count = stats.attention[key] ?? 0;
            const active = filters.attention === key;
            return (
              <button
                key={key}
                type="button"
                className={`attention-card ${count > 0 ? 'has-items' : ''} ${active ? 'is-active' : ''}`}
                aria-pressed={active}
                onClick={() => updateParams({ attention: active ? '' : key, status: '' })}
              >
                <ClockIcon size={18} />
                <span>
                  <strong>
                    {count} {label.toLowerCase()}
                  </strong>
                  <small>{hint}</small>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <form
        className="card product-toolbar admin-filter"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          updateParams({ q: form.q.trim(), seller: form.seller.trim() });
        }}
      >
        <label className="search-box">
          <SearchIcon />
          <input
            type="search"
            placeholder="Mã đơn (#12), người nhận, SĐT, email người mua"
            value={form.q}
            onChange={(e) => setForm({ ...form, q: e.target.value })}
            aria-label="Tìm đơn"
          />
        </label>
        <input
          type="search"
          className="admin-filter-input"
          placeholder="Tên / email người bán"
          value={form.seller}
          onChange={(e) => setForm({ ...form, seller: e.target.value })}
          aria-label="Người bán"
        />
        <label className="admin-filter-date">
          <span>Từ</span>
          <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => updateParams({ from: e.target.value })} />
        </label>
        <label className="admin-filter-date">
          <span>Đến</span>
          <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => updateParams({ to: e.target.value })} />
        </label>
        <select value={filters.sort || 'newest'} onChange={(e) => updateParams({ sort: e.target.value === 'newest' ? '' : e.target.value })} aria-label="Sắp xếp">
          {SORTS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary">
          Lọc
        </button>
        {hasFilter && (
          <button type="button" className="btn btn-secondary" onClick={() => setParams({})}>
            Xoá lọc
          </button>
        )}
      </form>

      <Alert>{error}</Alert>
      {result && <p className="muted">{result.totalItems} đơn</p>}

      {result && (
        <div className="table-wrap">
          <table className="doc-table admin-orders">
            <thead>
              <tr>
                <th>Đơn</th>
                <th>Sản phẩm</th>
                <th>Người mua</th>
                <th>Người bán</th>
                <th>Trạng thái</th>
                <th>Thanh toán</th>
                <th className="num">Tổng tiền</th>
              </tr>
            </thead>
            <tbody>
              {result.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    Không có đơn nào phù hợp.
                  </td>
                </tr>
              )}
              {result.items.map((o) => {
                const [payLabel, payBadge] = paymentState(o);
                const first = o.items[0];
                return (
                  <tr key={o.id}>
                    <td>
                      <Link to={`/orders/${o.id}`}>
                        <strong>#{o.id}</strong>
                      </Link>
                      <br />
                      <small className="muted">{formatDate(o.createdAt)}</small>
                    </td>
                    <td>
                      <div className="admin-order-item">
                        <ProductImage product={{ imageUrl: first?.imageUrl, name: first?.productName }} className="history-thumb" />
                        <span>
                          {first?.productName}
                          {o.items.length > 1 && <small className="muted"> +{o.items.length - 1} sản phẩm</small>}
                        </span>
                      </div>
                    </td>
                    <td>
                      {o.customer.displayName}
                      <br />
                      <small className="muted">{o.customer.email}</small>
                    </td>
                    <td>
                      {o.seller ? (
                        <button type="button" className="link-button" onClick={() => updateParams({ seller: o.seller.displayName })} title="Lọc đơn của người bán này">
                          {o.seller.displayName}
                        </button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <OrderStatusBadge status={o.status} />
                      <br />
                      <small className="muted admin-order-milestone">{milestone(o)}</small>
                    </td>
                    <td>
                      <span className={`badge ${payBadge}`}>{payLabel}</span>
                    </td>
                    <td className="num">
                      <strong>{formatPrice(o.totalAmount)}</strong>
                      <br />
                      <small className="muted">{o.totalQuantity} sp</small>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {result && (
        <Pagination page={result.page} totalPages={result.totalPages} onChange={(p) => updateParams({ page: p > 0 ? String(p) : '' })} />
      )}
    </>
  );
}
