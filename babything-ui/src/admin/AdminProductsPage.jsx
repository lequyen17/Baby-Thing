import { useEffect, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Alert } from '../components/Form';
import { CheckIcon, SearchIcon, XCircleIcon, XIcon } from '../components/Icons';
import { ListingSpecs } from '../components/ListingSpecs';
import { Pagination } from '../components/Pagination';
import { ProductImage } from '../components/ProductImage';
import { formatDate, formatPrice, PRODUCT_STATUSES } from '../utils/format';

const PAGE_SIZE = 10;
const TABS = ['PENDING_REVIEW', 'REJECTED', 'ACTIVE', 'INACTIVE'];

const SORTS = [
  ['oldest', 'Cũ nhất trước'],
  ['newest', 'Mới nhất trước'],
  ['price_desc', 'Giá: cao đến thấp'],
  ['price_asc', 'Giá: thấp đến cao'],
];

/**
 * Quản trị tin đăng (tài liệu BMC 7.3.2): hàng đợi duyệt (cũ nhất lên trước), tìm theo tên / SKU,
 * lọc danh mục / người bán, chọn nhiều tin để duyệt hoặc từ chối cùng lúc.
 */
export default function AdminProductsPage() {
  const { refresh } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'PENDING_REVIEW';
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const sellerId = params.get('sellerId') ?? '';
  const sellerName = params.get('sellerName') ?? '';
  const sort = params.get('sort') ?? (status === 'PENDING_REVIEW' ? 'oldest' : 'newest');
  const page = Number(params.get('page') ?? 0) || 0;
  const [search, setSearch] = useState(q);
  const [categories, setCategories] = useState([]);
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => setSearch(q), [q]);

  useEffect(() => {
    api('/products/categories')
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ status, sort, page: String(page), size: String(PAGE_SIZE) });
    if (q) query.set('q', q);
    if (category) query.set('category', category);
    if (sellerId) query.set('sellerId', sellerId);
    api(`/products?${query}`)
      .then((data) => {
        if (cancelled) return;
        setResult(data);
        setSelected([]);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [status, q, category, sellerId, sort, page, version]);

  const updateParams = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const askReason = (label) => {
    const reason = window.prompt(`Lý do từ chối ${label} (người bán sẽ thấy để sửa lại):`, '');
    if (reason === null) return null;
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do từ chối.');
      return null;
    }
    return reason.trim();
  };

  /** Chạy lần lượt từng tin; tin lỗi (vd. đã bị người khác duyệt) không chặn các tin còn lại. */
  const runBatch = async (products, action, reason) => {
    setBusy(true);
    setError('');
    setNotice('');
    const failed = [];
    for (const p of products) {
      try {
        await api(`/products/${p.id}/${action}`, { method: 'POST', body: action === 'reject' ? { reason } : undefined });
      } catch (err) {
        failed.push(`"${p.name}": ${err.message}`);
      }
    }
    const done = products.length - failed.length;
    if (done > 0) setNotice(`Đã ${action === 'approve' ? 'duyệt' : 'từ chối'} ${done} tin.`);
    if (failed.length) setError(`Không xử lý được ${failed.length} tin. ${failed.join(' · ')}`);
    setBusy(false);
    setVersion((v) => v + 1);
    refresh();
  };

  const act = (product, action) => {
    if (action === 'reject') {
      const reason = askReason(`"${product.name}"`);
      if (reason) runBatch([product], 'reject', reason);
    } else {
      runBatch([product], 'approve');
    }
  };

  const items = result?.items ?? [];
  const selectedItems = items.filter((p) => selected.includes(p.id));
  const allSelected = items.length > 0 && selectedItems.length === items.length;
  const toggle = (id) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const canBatch = status === 'PENDING_REVIEW' || status === 'ACTIVE';

  return (
    <>
      <div className="segmented" role="tablist">
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={status === value}
            className={status === value ? 'is-active' : undefined}
            onClick={() => updateParams({ status: value === 'PENDING_REVIEW' ? '' : value, sort: '' })}
          >
            {PRODUCT_STATUSES[value].label}
          </button>
        ))}
      </div>

      <form
        className="card product-toolbar admin-filter"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          updateParams({ q: search.trim() });
        }}
      >
        <label className="search-box">
          <SearchIcon />
          <input type="search" placeholder="Tên sản phẩm hoặc SKU" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Tìm tin" />
        </label>
        <select value={category} onChange={(e) => updateParams({ category: e.target.value })} aria-label="Danh mục">
          <option value="">Mọi danh mục</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
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
          Tìm
        </button>
      </form>

      {sellerId && (
        <div className="filter-chips">
          <span className="filter-chip">
            Người bán: {sellerName || `#${sellerId}`}
            <button type="button" aria-label="Bỏ lọc người bán" onClick={() => updateParams({ sellerId: '', sellerName: '' })}>
              <XIcon size={14} />
            </button>
          </span>
        </div>
      )}

      <Alert type="success">{notice}</Alert>
      <Alert>{error}</Alert>

      {result && (
        <div className="bulk-bar">
          {canBatch && items.length > 0 && (
            <label className="bulk-select">
              <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : items.map((p) => p.id))} />
              {selected.length > 0 ? `Đã chọn ${selected.length}` : 'Chọn cả trang'}
            </label>
          )}
          <span className="muted">{result.totalItems} tin</span>
          {selected.length > 0 && (
            <div className="bulk-actions">
              {status === 'PENDING_REVIEW' && (
                <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => runBatch(selectedItems, 'approve')}>
                  <CheckIcon size={16} /> Duyệt {selected.length} tin
                </button>
              )}
              <button
                type="button"
                className="btn btn-danger btn-sm"
                disabled={busy}
                onClick={() => {
                  const reason = askReason(`${selected.length} tin đã chọn`);
                  if (reason) runBatch(selectedItems, 'reject', reason);
                }}
              >
                <XCircleIcon size={16} /> {status === 'PENDING_REVIEW' ? 'Từ chối' : 'Gỡ'} {selected.length} tin
              </button>
            </div>
          )}
        </div>
      )}

      {result && items.length === 0 && (
        <div className="card empty-state">
          <p className="muted">{status === 'PENDING_REVIEW' && !q && !category && !sellerId ? 'Không còn tin nào chờ duyệt.' : 'Không có tin nào phù hợp.'}</p>
        </div>
      )}

      <ul className="review-list">
        {items.map((p) => (
          <li key={p.id} className={`card review-item ${canBatch ? 'is-selectable' : ''} ${selected.includes(p.id) ? 'is-selected' : ''}`}>
            {canBatch && (
              <input type="checkbox" className="review-check" aria-label={`Chọn "${p.name}"`} checked={selected.includes(p.id)} onChange={() => toggle(p.id)} />
            )}
            <Link to={`/products/${p.id}`} className="review-media">
              <ProductImage product={p} className="history-thumb" />
              <span className="muted">{p.imageUrls.length} ảnh</span>
            </Link>
            <div className="review-body">
              <div className="order-row-title">
                <Link to={`/products/${p.id}`}>
                  <strong>{p.name}</strong>
                </Link>
                <span className="product-price">{formatPrice(p.price)}</span>
              </div>
              <span className="muted">
                {p.category || 'Chưa phân loại'} · Người bán{' '}
                <button
                  type="button"
                  className="link-button"
                  title="Xem các tin của người bán này"
                  onClick={() => updateParams({ sellerId: String(p.sellerId), sellerName: p.sellerName ?? '' })}
                >
                  {p.sellerName ?? `#${p.sellerId}`}
                </button>{' '}
                · Gửi lúc {formatDate(p.updatedAt)}
              </span>
              <ListingSpecs item={p} />
              {p.status === 'REJECTED' && p.rejectReason && <p className="payment-failure">Lý do từ chối: {p.rejectReason}</p>}
            </div>
            <div className="review-actions">
              {p.status === 'PENDING_REVIEW' && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => act(p, 'approve')} disabled={busy}>
                  <CheckIcon size={16} /> Duyệt
                </button>
              )}
              {p.status !== 'REJECTED' && (
                <button type="button" className="btn btn-danger btn-sm" onClick={() => act(p, 'reject')} disabled={busy}>
                  <XCircleIcon size={16} /> {p.status === 'PENDING_REVIEW' ? 'Từ chối' : 'Gỡ tin'}
                </button>
              )}
              <Link to={`/products/${p.id}/edit`} className="btn btn-secondary btn-sm">
                Sửa
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {result && <Pagination page={result.page} totalPages={result.totalPages} onChange={(p) => updateParams({ page: p > 0 ? String(p) : '' })} />}
    </>
  );
}
