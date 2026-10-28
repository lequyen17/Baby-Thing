import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Alert } from '../components/Form';
import { PlusIcon, SearchIcon } from '../components/Icons';
import { ORDER_STATUSES, OrderStatusBadge } from '../components/OrderStatus';
import { Pagination } from '../components/Pagination';
import { ProductImage } from '../components/ProductImage';
import { formatDate, formatPrice } from '../utils/format';

const PAGE_SIZE = 10;

const SORTS = [
  ['newest', 'Newest'],
  ['oldest', 'Oldest'],
  ['total_desc', 'Total: high to low'],
  ['total_asc', 'Total: low to high'],
];

function itemSummary(items) {
  if (items.length === 0) return '';
  const [first, ...rest] = items;
  return rest.length > 0 ? `${first.productName} + ${rest.length} more` : first.productName;
}

/** Tab ứng với tham số view của API; '' = tất cả (chỉ admin). */
const VIEWS = [
  ['buying', 'Purchases'],
  ['selling', 'Sales'],
];

/** Đơn mua / đơn bán của mình; admin có thêm tab tất cả. Bộ lọc nằm trên URL giống trang Products. */
export default function OrderListPage() {
  const { user } = useAuth();
  const isAdmin = user.role === 'ADMIN';
  const notice = useLocation().state?.notice ?? '';
  const [params, setParams] = useSearchParams();
  const view = params.get('view') ?? (isAdmin ? '' : 'buying');
  const views = isAdmin ? [['', 'All orders'], ...VIEWS] : VIEWS;
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const sort = params.get('sort') ?? 'newest';
  const page = Number(params.get('page') ?? 0) || 0;

  const [search, setSearch] = useState(q);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => setSearch(q), [q]);

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ sort, page: String(page), size: String(PAGE_SIZE) });
    if (view) query.set('view', view);
    if (q) query.set('q', q);
    if (status) query.set('status', status);
    setError('');
    api(`/orders?${query}`)
      .then((data) => !cancelled && setResult(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [view, q, status, sort, page]);

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

  const filtered = Boolean(q || status);
  const selling = view === 'selling';

  return (
    <div className="page">
      <Alert type="success">{notice}</Alert>
      <div className="page-header page-header-row">
        <div>
          <h1>Orders</h1>
          <p className="muted">
            {result ? `${result.totalItems} order${result.totalItems === 1 ? '' : 's'}` : 'Loading...'}
          </p>
        </div>
        <Link to="/orders/new" className="btn btn-primary">
          <PlusIcon /> New order
        </Link>
      </div>

      <div className="segmented" role="tablist">
        {views.map(([value, label]) => (
          <button
            key={value || 'all'}
            type="button"
            role="tab"
            aria-selected={view === value}
            className={view === value ? 'is-active' : undefined}
            // Tab mặc định không cần ghi lên URL; admin chọn "tất cả" cũng vậy
            onClick={() => updateParams({ view: value === (isAdmin ? '' : 'buying') ? '' : value })}
          >
            {label}
          </button>
        ))}
      </div>

      <form className="card product-toolbar" onSubmit={handleSearch} role="search">
        <label className="search-box">
          <SearchIcon />
          <input
            type="search"
            placeholder={isAdmin ? 'Order #, recipient, phone or email' : 'Order #, recipient or phone'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search orders"
          />
        </label>
        <select value={status} onChange={(e) => updateParams({ status: e.target.value })} aria-label="Status">
          <option value="">All statuses</option>
          {Object.entries(ORDER_STATUSES).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => updateParams({ sort: e.target.value })} aria-label="Sort by">
          {SORTS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      <Alert>{error}</Alert>

      {result && result.items.length === 0 && (
        <div className="card empty-state">
          <p className="muted">
            {filtered ? (
              'No orders match your filters.'
            ) : selling ? (
              <>
                Nobody has ordered your listings yet. <Link to="/products/new">Sell an item</Link>
              </>
            ) : (
              <>
                You have no orders yet. <Link to="/products">Browse products</Link>
              </>
            )}
          </p>
        </div>
      )}

      {result && result.items.length > 0 && (
        <ul className="card order-list">
          {result.items.map((order) => (
            <li key={order.id}>
              <Link to={`/orders/${order.id}`} className="order-row">
                <ProductImage
                  product={{ imageUrl: order.items[0]?.imageUrl, name: order.items[0]?.productName }}
                  className="history-thumb"
                />
                <div className="order-row-info">
                  <div className="order-row-title">
                    <strong>Order #{order.id}</strong>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <span className="order-row-items">{itemSummary(order.items)}</span>
                  <span className="muted order-row-meta">
                    {formatDate(order.createdAt)} · {order.totalQuantity} item{order.totalQuantity === 1 ? '' : 's'}
                    {view === 'buying'
                      ? order.seller && ` · Seller: ${order.seller.displayName}`
                      : ` · Buyer: ${order.customer.email ?? order.customer.displayName}`}
                  </span>
                </div>
                <span className="product-price order-row-total">{formatPrice(order.totalAmount)}</span>
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
