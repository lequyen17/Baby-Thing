import { Link } from 'react-router-dom';
import { formatPrice } from '../utils/format';
import { categoryArt } from '../utils/categoryArt';
import { ProductImage } from './ProductImage';

export function StockBadge({ stock }) {
  if (stock <= 0) return <span className="badge badge-danger">Hết hàng</span>;
  if (stock <= 5) return <span className="badge badge-warning">Chỉ còn {stock}</span>;
  return <span className="badge badge-success">Còn hàng</span>;
}

export function ProductCard({ product, showStatus = false, footer }) {
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
      <div className="product-card-footer">
        {footer ?? (
          <Link to={`/products/${product.id}`} className="btn btn-dark btn-block">
            Xem chi tiết
          </Link>
        )}
      </div>
    </article>
  );
}
