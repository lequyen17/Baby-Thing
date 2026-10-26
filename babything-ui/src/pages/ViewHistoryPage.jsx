import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Alert } from '../components/Form';
import { TrashIcon } from '../components/Icons';
import { Pagination } from '../components/Pagination';
import { ProductImage } from '../components/ProductImage';
import { formatDate, formatPrice } from '../utils/format';

const PAGE_SIZE = 10;

export default function ViewHistoryPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async (p) => {
    setError('');
    try {
      const data = await api(`/users/me/product-history?page=${p}&size=${PAGE_SIZE}`);
      // Xoá hết mục ở trang cuối thì lùi về trang trước
      if (data.items.length === 0 && p > 0) {
        setPage(p - 1);
        return;
      }
      setResult(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [load, page]);

  const remove = async (productId) => {
    try {
      await api(`/users/me/product-history/${productId}`, { method: 'DELETE' });
      await load(page);
    } catch (err) {
      setError(err.message);
    }
  };

  const clearAll = async () => {
    if (!window.confirm('Clear your entire viewing history?')) return;
    try {
      await api('/users/me/product-history', { method: 'DELETE' });
      setPage(0);
      await load(0);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <div className="page-header page-header-row">
        <div>
          <h1>Recently viewed</h1>
          <p className="muted">Products you have opened, most recent first.</p>
        </div>
        {result?.totalItems > 0 && (
          <button type="button" className="btn btn-secondary" onClick={clearAll}>
            <TrashIcon /> Clear history
          </button>
        )}
      </div>

      <Alert>{error}</Alert>
      {!result && !error && <p className="muted">Loading...</p>}

      {result?.totalItems === 0 && (
        <div className="card empty-state">
          <p className="muted">
            You have not viewed any products yet. <Link to="/products">Browse products</Link>
          </p>
        </div>
      )}

      {result?.items.length > 0 && (
        <ul className="card history-list">
          {result.items.map(({ product, viewCount, lastViewedAt }) => {
            const available = product.status === 'ACTIVE' || user.role === 'ADMIN';
            const content = (
              <>
                <ProductImage product={product} className="history-thumb" />
                <div className="history-info">
                  <strong>{product.name}</strong>
                  <span className="product-price">{formatPrice(product.price)}</span>
                  <span className="muted history-meta">
                    Viewed {viewCount} time{viewCount === 1 ? '' : 's'} · Last {formatDate(lastViewedAt)}
                  </span>
                </div>
              </>
            );
            return (
              <li key={product.id} className="history-row">
                {available ? (
                  <Link to={`/products/${product.id}`} className="history-link">
                    {content}
                  </Link>
                ) : (
                  <div className="history-link is-unavailable">
                    {content}
                    <span className="badge badge-muted">No longer available</span>
                  </div>
                )}
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => remove(product.id)}
                  aria-label={`Remove ${product.name} from history`}
                  title="Remove from history"
                >
                  <TrashIcon />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {result && <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />}
    </div>
  );
}
