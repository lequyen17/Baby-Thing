import { Link } from 'react-router-dom';
import { formatPrice } from '../utils/format';
import { ProductImage } from './ProductImage';

export function StockBadge({ stock }) {
  if (stock <= 0) return <span className="badge badge-danger">Out of stock</span>;
  if (stock <= 5) return <span className="badge badge-warning">Only {stock} left</span>;
  return <span className="badge badge-success">In stock</span>;
}

export function ProductCard({ product, showStatus = false, footer }) {
  return (
    <article className="card product-card">
      <Link to={`/products/${product.id}`} className="product-card-link">
        <ProductImage product={product} />
        <div className="product-card-body">
          {product.category && <span className="product-category">{product.category}</span>}
          <h2 className="product-card-name">{product.name}</h2>
          <div className="product-price">{formatPrice(product.price)}</div>
          <div className="badges">
            <StockBadge stock={product.stock} />
            {showStatus && product.status !== 'ACTIVE' && <span className="badge badge-muted">Hidden</span>}
          </div>
        </div>
      </Link>
      {footer && <div className="product-card-footer">{footer}</div>}
    </article>
  );
}
