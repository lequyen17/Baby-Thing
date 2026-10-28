import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { formatPrice } from '../utils/format';
import { categoryArt } from '../utils/categoryArt';
import { HeartIcon, MessageIcon } from './Icons';
import { ProductImage } from './ProductImage';

export function StockBadge({ stock }) {
  if (stock <= 0) return <span className="badge badge-danger">Hết hàng</span>;
  if (stock <= 5) return <span className="badge badge-warning">Chỉ còn {stock}</span>;
  return <span className="badge badge-success">Còn hàng</span>;
}

/** Lý do không đặt được (giống điều kiện ở trang chi tiết); null = đặt được. */
function unavailableReason(product, user) {
  if (product.sellerId === user.id) return 'Tin của bạn';
  if (product.status !== 'ACTIVE') return 'Đang ẩn';
  if (product.stock <= 0) return 'Hết hàng';
  return null;
}

export function ProductCard({ product, showStatus = false, footer }) {
  const { user } = useAuth();
  // Lưu tin chưa có backend: chỉ đổi trạng thái trên giao diện
  const [saved, setSaved] = useState(false);
  const unavailable = unavailableReason(product, user);

  return (
    <article className="product-card">
      <Link to={`/products/${product.id}`} className="product-card-link">
        <div className="product-card-media" style={{ background: categoryArt(product.category).tint }}>
          <ProductImage product={product} />
          <div className="product-card-badges">
            <StockBadge stock={product.stock} />
            {showStatus && product.status !== 'ACTIVE' && <span className="badge badge-muted">Đang ẩn</span>}
          </div>
        </div>
        <div className="product-card-body">
          <h2 className="product-card-name">{product.name}</h2>
          <div className="product-price">{formatPrice(product.price)}</div>
          <div className="product-card-meta">
            <span>{product.category || 'Khác'}</span>
            <span>SKU {product.sku}</span>
          </div>
        </div>
      </Link>
      <button
        type="button"
        className={`product-card-save ${saved ? 'is-saved' : ''}`}
        aria-label={saved ? 'Bỏ lưu tin' : 'Lưu tin'}
        aria-pressed={saved}
        onClick={() => setSaved((v) => !v)}
      >
        <HeartIcon size={20} />
      </button>
      <div className="product-card-footer">
        {footer ?? (
          <div className="product-card-actions">
            <Link to="/messages" className="btn btn-secondary">
              <MessageIcon size={16} /> Nhắn tin
            </Link>
            {unavailable ? (
              <button type="button" className="btn btn-dark" disabled>
                {unavailable}
              </button>
            ) : (
              <Link to="/orders/new" state={{ product }} className="btn btn-dark">
                Mua ngay
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
