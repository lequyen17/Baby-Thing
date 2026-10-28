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
    if (!window.confirm('Xoá toàn bộ lịch sử xem?')) return;
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
          <h1>Sản phẩm đã xem</h1>
          <p className="muted">Những sản phẩm bạn đã mở, mới nhất ở trên.</p>
        </div>
        {result?.totalItems > 0 && (
          <button type="button" className="btn btn-secondary" onClick={clearAll}>
            <TrashIcon /> Xoá lịch sử
          </button>
        )}
      </div>

      <Alert>{error}</Alert>
      {!result && !error && <p className="muted">Đang tải…</p>}

      {result?.totalItems === 0 && (
        <div className="card empty-state">
          <p className="muted">
            Bạn chưa xem sản phẩm nào. <Link to="/products">Xem sản phẩm</Link>
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
                    Đã xem {viewCount} lần · Gần nhất {formatDate(lastViewedAt)}
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
                    <span className="badge badge-muted">Không còn bán</span>
                  </div>
                )}
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => remove(product.id)}
                  aria-label={`Xoá ${product.name} khỏi lịch sử`}
                  title="Xoá khỏi lịch sử"
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
