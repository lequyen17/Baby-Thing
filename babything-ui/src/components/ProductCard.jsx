import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useRequireLogin } from '../auth/RouteGuards';
import { useContactSeller } from '../messages/useMessages';
import { formatPrice, PRODUCT_STATUSES } from '../utils/format';
import { categoryArt } from '../utils/categoryArt';
import { addToCart } from '../cart/useCart';
import { CartIcon, CheckIcon, HeartIcon, MessageIcon } from './Icons';
import { ProductImage } from './ProductImage';

export function StockBadge({ stock }) {
  if (stock <= 0) return <span className="badge badge-danger">Hết hàng</span>;
  if (stock <= 5) return <span className="badge badge-warning">Chỉ còn {stock}</span>;
  return <span className="badge badge-success">Còn hàng</span>;
}

/** Lý do không đặt được (giống điều kiện ở trang chi tiết); null = đặt được. user = null là khách. */
function unavailableReason(product, user) {
  if (user && product.sellerId === user.id) return 'Tin của bạn';
  if (product.status !== 'ACTIVE') return PRODUCT_STATUSES[product.status]?.label ?? 'Đang ẩn';
  if (product.stock <= 0) return 'Hết hàng';
  return null;
}

export function ProductCard({ product, showStatus = false, footer }) {
  const { user } = useAuth();
  // Lưu tin chưa có backend: chỉ đổi trạng thái trên giao diện
  const [saved, setSaved] = useState(false);
  const unavailable = unavailableReason(product, user);
  const isOwn = Boolean(user) && product.sellerId === user.id;
  const contactSeller = useContactSeller();
  // Khách bấm nhắn tin / thêm giỏ / mua: đăng nhập trước rồi quay lại trang này
  const requireLogin = useRequireLogin();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAddToCart = async () => {
    setAdding(true);
    try {
      await addToCart(product.id);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      window.alert(err.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <article className="product-card">
      <Link to={`/products/${product.id}`} className="product-card-link">
        <div className="product-card-media" style={{ background: categoryArt(product.category).tint }}>
          <ProductImage product={product} />
          <div className="product-card-badges">
            <StockBadge stock={product.stock} />
            {product.care && <span className="badge badge-renewed">Renewed · {product.care.grade}</span>}
            {showStatus && product.status !== 'ACTIVE' && (
              <span className={`badge ${PRODUCT_STATUSES[product.status]?.badge ?? 'badge-muted'}`}>
                {PRODUCT_STATUSES[product.status]?.label ?? product.status}
              </span>
            )}
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
            {isOwn ? (
              <button type="button" className="btn btn-secondary" disabled>
                <MessageIcon size={16} /> Nhắn tin
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  requireLogin(() => contactSeller({ productId: product.id }).catch((err) => window.alert(err.message)))
                }
              >
                <MessageIcon size={16} /> Nhắn tin
              </button>
            )}
            {unavailable ? (
              <button type="button" className="btn btn-dark" disabled>
                {unavailable}
              </button>
            ) : (
              <>
                {user?.role !== 'ADMIN' && (
                  <button
                    type="button"
                    className={`btn btn-secondary btn-cart ${added ? 'is-added' : ''}`}
                    onClick={() => requireLogin(handleAddToCart)}
                    disabled={adding}
                    aria-label={added ? 'Đã thêm vào giỏ' : 'Thêm vào giỏ'}
                    title={added ? 'Đã thêm vào giỏ' : 'Thêm vào giỏ'}
                  >
                    {added ? <CheckIcon size={16} /> : <CartIcon size={16} />}
                  </button>
                )}
                {user ? (
                  <Link to="/orders/new" state={{ product }} className="btn btn-dark">
                    Mua ngay
                  </Link>
                ) : (
                  <button type="button" className="btn btn-dark" onClick={() => requireLogin()}>
                    Mua ngay
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
