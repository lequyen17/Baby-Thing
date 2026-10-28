import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { Alert } from '../components/Form';
import { ArrowLeftIcon, CartIcon, EditIcon, EyeIcon, TrashIcon } from '../components/Icons';
import { Pagination } from '../components/Pagination';
import { StockBadge } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { formatCondition, formatDate, formatPrice } from '../utils/format';

/** Người bán / admin: ai đã xem sản phẩm này, sắp theo lần xem gần nhất. */
function ProductViewers({ productId }) {
  const [page, setPage] = useState(0);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/products/${productId}/views?page=${page}&size=10`)
      .then(setStats)
      .catch((err) => setError(err.message));
  }, [productId, page]);

  return (
    <section className="card">
      <h2 className="card-title">View history</h2>
      <Alert>{error}</Alert>
      {stats && (
        <>
          <p className="muted card-description">
            {stats.totalViews} view{stats.totalViews === 1 ? '' : 's'} by {stats.viewers.totalItems} customer
            {stats.viewers.totalItems === 1 ? '' : 's'}
          </p>
          {stats.viewers.items.length > 0 && (
            <ul className="viewer-list">
              {stats.viewers.items.map((v) => (
                <li key={v.userId} className="viewer-row">
                  <Avatar user={v} size={32} />
                  <div className="viewer-identity">
                    <strong>{v.displayName}</strong>
                    <span className="muted">{v.email}</span>
                  </div>
                  <div className="viewer-meta">
                    <span>
                      {v.viewCount} view{v.viewCount === 1 ? '' : 's'}
                    </span>
                    <span className="muted">Last: {formatDate(v.lastViewedAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={stats.viewers.page} totalPages={stats.viewers.totalPages} onChange={setPage} />
        </>
      )}
    </section>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user.role === 'ADMIN';
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const canManage = Boolean(product) && (isAdmin || product.sellerId === user.id);
  const condition = product && formatCondition(product.condition);

  // Mỗi lần mở trang chi tiết, server ghi một lượt xem vào lịch sử của người dùng
  useEffect(() => {
    setProduct(null);
    setError('');
    api(`/products/${id}`)
      .then(setProduct)
      .catch((err) => setError(err.message));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${product.name}"? Customers will no longer see it.`)) return;
    setDeleting(true);
    try {
      await api(`/products/${id}`, { method: 'DELETE' });
      navigate('/products', { replace: true });
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  return (
    <div className="page">
      <Link to="/products" className="back-link">
        <ArrowLeftIcon size={16} /> All products
      </Link>
      <Alert>{error}</Alert>
      {!product && !error && <p className="muted">Loading...</p>}

      {product && (
        <>
          <section className="card product-detail">
            <ProductImage product={product} className="product-detail-image" />
            <div className="product-detail-info">
              {product.category && <span className="product-category">{product.category}</span>}
              <h1>{product.name}</h1>
              <p className="muted">
                SKU: {product.sku}
                {product.sellerName && ` · Seller: ${product.sellerId === user.id ? 'you' : product.sellerName}`}
              </p>
              <div className="product-price product-price-lg">{formatPrice(product.price)}</div>
              <div className="badges">
                <StockBadge stock={product.stock} />
                {condition && <span className="badge">{condition}</span>}
                {canManage && (
                  <span className={`badge ${product.status === 'ACTIVE' ? 'badge-success' : 'badge-muted'}`}>
                    {product.status === 'ACTIVE' ? 'Visible' : 'Hidden'}
                  </span>
                )}
                {canManage && <span className="badge">Stock: {product.stock}</span>}
              </div>
              {product.description && <p className="product-description">{product.description}</p>}
              {product.status === 'ACTIVE' && product.stock > 0 && (
                <div className="product-actions">
                  <Link to="/orders/new" state={{ product }} className="btn btn-primary">
                    <CartIcon /> Order now
                  </Link>
                </div>
              )}
              {canManage && (
                <>
                  <p className="muted product-meta">
                    Created {formatDate(product.createdAt)} · Updated {formatDate(product.updatedAt)}
                  </p>
                  <div className="product-actions">
                    <Link to={`/products/${product.id}/edit`} state={{ product }} className="btn btn-secondary">
                      <EditIcon /> Edit
                    </Link>
                    <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                      <TrashIcon /> {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>

          {canManage ? (
            <ProductViewers productId={product.id} />
          ) : (
            <p className="muted page-hint">
              <EyeIcon size={14} /> Products you open are saved in your <Link to="/history">view history</Link>.
            </p>
          )}
        </>
      )}
    </div>
  );
}
