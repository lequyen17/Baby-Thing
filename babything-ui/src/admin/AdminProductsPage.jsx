import { useEffect, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Alert } from '../components/Form';
import { CheckIcon, XCircleIcon } from '../components/Icons';
import { ListingSpecs } from '../components/ListingSpecs';
import { Pagination } from '../components/Pagination';
import { ProductImage } from '../components/ProductImage';
import { formatDate, formatPrice, PRODUCT_STATUSES } from '../utils/format';

const PAGE_SIZE = 10;
const TABS = ['PENDING_REVIEW', 'REJECTED', 'ACTIVE', 'INACTIVE'];

/** Hàng đợi kiểm duyệt (tài liệu BMC 7.3.2): tin cũ nhất lên trước, duyệt / từ chối ngay trên danh sách. */
export default function AdminProductsPage() {
  const { refresh } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'PENDING_REVIEW';
  const page = Number(params.get('page') ?? 0) || 0;
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({
      status,
      sort: status === 'PENDING_REVIEW' ? 'oldest' : 'newest',
      page: String(page),
      size: String(PAGE_SIZE),
    });
    api(`/products?${query}`)
      .then((data) => !cancelled && setResult(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [status, page, version]);

  const act = async (product, action) => {
    let body;
    if (action === 'reject') {
      const reason = window.prompt(`Lý do từ chối "${product.name}" (người bán sẽ thấy):`, '');
      if (reason === null) return;
      body = { reason };
    }
    setBusyId(product.id);
    setError('');
    setNotice('');
    try {
      await api(`/products/${product.id}/${action}`, { method: 'POST', body });
      setNotice(action === 'approve' ? `Đã duyệt "${product.name}".` : `Đã từ chối "${product.name}".`);
      setVersion((v) => v + 1);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

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
            onClick={() => setParams(value === 'PENDING_REVIEW' ? {} : { status: value })}
          >
            {PRODUCT_STATUSES[value].label}
          </button>
        ))}
      </div>
      <Alert type="success">{notice}</Alert>
      <Alert>{error}</Alert>
      {result && <p className="muted">{result.totalItems} tin</p>}

      {result && result.items.length === 0 && (
        <div className="card empty-state">
          <p className="muted">{status === 'PENDING_REVIEW' ? 'Không còn tin nào chờ duyệt.' : 'Không có tin nào.'}</p>
        </div>
      )}

      <ul className="review-list">
        {result?.items.map((p) => (
          <li key={p.id} className="card review-item">
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
                <Link to={`/sellers/${p.sellerId}`}>{p.sellerName ?? `#${p.sellerId}`}</Link> · Gửi lúc {formatDate(p.updatedAt)}
              </span>
              <ListingSpecs item={p} />
              {p.status === 'REJECTED' && p.rejectReason && <p className="payment-failure">Lý do từ chối: {p.rejectReason}</p>}
            </div>
            <div className="review-actions">
              {p.status === 'PENDING_REVIEW' && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => act(p, 'approve')} disabled={busyId === p.id}>
                  <CheckIcon size={16} /> Duyệt
                </button>
              )}
              {p.status !== 'REJECTED' && (
                <button type="button" className="btn btn-danger btn-sm" onClick={() => act(p, 'reject')} disabled={busyId === p.id}>
                  <XCircleIcon size={16} /> {p.status === 'PENDING_REVIEW' ? 'Từ chối' : 'Gỡ tin'}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {result && (
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          onChange={(p) => setParams({ ...(status !== 'PENDING_REVIEW' && { status }), ...(p > 0 && { page: String(p) }) })}
        />
      )}
    </>
  );
}
