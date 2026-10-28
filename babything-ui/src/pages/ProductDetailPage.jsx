import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { Alert } from '../components/Form';
import { ArrowLeftIcon, CartIcon, CheckIcon, EditIcon, EyeIcon, MessageIcon, SparkleIcon, TrashIcon, XCircleIcon } from '../components/Icons';
import { ListingSpecs } from '../components/ListingSpecs';
import { useContactSeller } from '../messages/useMessages';
import { addToCart } from '../cart/useCart';
import { Pagination } from '../components/Pagination';
import { StockBadge } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { formatDate, formatPrice, PRODUCT_STATUSES } from '../utils/format';

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
      <h2 className="card-title">Lượt xem</h2>
      <Alert>{error}</Alert>
      {stats && (
        <>
          <p className="muted card-description">
            {stats.totalViews} lượt xem từ {stats.viewers.totalItems} người
          </p>
          {stats.viewers.items.length > 0 && (
            <ul className="viewer-list">
              {stats.viewers.items.map((v) => (
                <li key={v.userId} className="viewer-row">
                  <Avatar user={v} size={32} />
                  <div className="viewer-identity">
                    <strong>{v.displayName}</strong>
                    {v.email && <span className="muted">{v.email}</span>}
                  </div>
                  <div className="viewer-meta">
                    <span>{v.viewCount} lượt xem</span>
                    <span className="muted">Gần nhất: {formatDate(v.lastViewedAt)}</span>
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

/** Ảnh lớn + dãy ảnh nhỏ để chọn. */
function Gallery({ product }) {
  const images = product.imageUrls?.length ? product.imageUrls : [product.imageUrl].filter(Boolean);
  const [index, setIndex] = useState(0);
  const current = images[Math.min(index, images.length - 1)];
  return (
    <div className="gallery">
      <ProductImage product={{ ...product, imageUrl: current }} className="product-detail-image" />
      {images.length > 1 && (
        <div className="gallery-thumbs">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              className={i === index ? 'is-active' : undefined}
              onClick={() => setIndex(i)}
              aria-label={`Xem ảnh ${i + 1}`}
            >
              <img src={url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user.role === 'ADMIN';
  const navigate = useNavigate();
  const location = useLocation();
  const contactSeller = useContactSeller();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice ?? '');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Tin Care thuộc người ký gửi nhưng chỉ Baby Things sửa / ẩn / xoá
  const canManage = Boolean(product) && (isAdmin || (product.sellerId === user.id && !product.care));
  const isOwner = Boolean(product) && product.sellerId === user.id;
  const statusInfo = product && PRODUCT_STATUSES[product.status];

  const run = async (request, message) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      setProduct(await request());
      setNotice(message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const setVisible = (visible) =>
    run(
      () => api(`/products/${id}/visibility`, { method: 'PATCH', body: { visible } }),
      visible ? 'Đã cập nhật hiển thị tin.' : 'Đã ẩn tin.',
    );

  const approve = () => run(() => api(`/products/${id}/approve`, { method: 'POST' }), 'Đã duyệt tin, tin đang hiển thị.');

  const handleAddToCart = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await addToCart(product.id);
      setNotice('Đã thêm vào giỏ hàng.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const reject = () => {
    const reason = window.prompt('Lý do từ chối (người bán sẽ thấy để sửa lại):', '');
    if (reason === null) return;
    run(() => api(`/products/${id}/reject`, { method: 'POST', body: { reason } }), 'Đã từ chối tin.');
  };

  // Mỗi lần mở trang chi tiết, server ghi một lượt xem vào lịch sử của người dùng
  useEffect(() => {
    setProduct(null);
    setError('');
    api(`/products/${id}`)
      .then(setProduct)
      .catch((err) => setError(err.message));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`Xoá tin "${product.name}"? Người mua sẽ không còn thấy tin này.`)) return;
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
        <ArrowLeftIcon size={16} /> Tất cả sản phẩm
      </Link>
      <Alert type="success">{notice}</Alert>
      <Alert>{error}</Alert>
      {!product && !error && <p className="muted">Đang tải…</p>}

      {product && (
        <>
          {canManage && product.status === 'PENDING_REVIEW' && (
            <div className="review-banner">
              <div>
                <strong>Tin đang chờ duyệt</strong>
                <p className="muted">
                  {isOwner
                    ? 'Người mua chưa thấy tin này. Baby Things kiểm tra ảnh thật, thông tin bắt buộc và danh mục được phép, thường trong 24 giờ.'
                    : 'Kiểm tra: ảnh thật (không dùng ảnh mạng), đủ thông tin tình trạng / lỗi, không thuộc danh mục hạn chế.'}
                </p>
              </div>
              {isAdmin && (
                <div className="product-actions">
                  <button type="button" className="btn btn-primary" onClick={approve} disabled={busy}>
                    <CheckIcon /> Duyệt tin
                  </button>
                  <button type="button" className="btn btn-danger" onClick={reject} disabled={busy}>
                    <XCircleIcon /> Từ chối
                  </button>
                </div>
              )}
            </div>
          )}
          {canManage && product.status === 'REJECTED' && (
            <div className="alert alert-error">
              <strong>Tin bị từ chối:</strong> {product.rejectReason}
              {isOwner && ' — sửa tin theo góp ý để gửi duyệt lại.'}
            </div>
          )}

          <section className="card product-detail">
            <Gallery product={product} />
            <div className="product-detail-info">
              {product.category && <span className="product-category">{product.category}</span>}
              <h1>{product.name}</h1>
              <p className="muted">
                SKU: {product.sku}
                {product.sellerName && (
                  <>
                    {' · Người bán: '}
                    {isOwner ? 'bạn' : <Link to={`/sellers/${product.sellerId}`}>{product.sellerName}</Link>}
                  </>
                )}
              </p>
              <div className="product-price product-price-lg">{formatPrice(product.price)}</div>
              <div className="badges">
                <StockBadge stock={product.stock} />
                {canManage && statusInfo && <span className={`badge ${statusInfo.badge}`}>{statusInfo.label}</span>}
                {canManage && <span className="badge">Tồn kho: {product.stock}</span>}
              </div>
              {product.care && (
                <div className="care-renewed">
                  <strong>
                    <SparkleIcon size={18} /> BabyThings Renewed · Cấp {product.care.gradeLabel}
                  </strong>
                  <span>
                    Baby Things đã kiểm tra, làm sạch theo quy trình và chụp ảnh thật
                    {product.care.cleanedAt && ` (${formatDate(product.care.cleanedAt, true)})`}. Lô ký gửi {product.care.batchCode}.
                  </span>
                  {isOwner && <span className="muted">Tin ký gửi của bạn do Baby Things quản lý. Theo dõi tại <Link to="/care">BabyThings Care</Link>.</span>}
                </div>
              )}
              <ListingSpecs item={product} />
              {product.description && <p className="product-description">{product.description}</p>}
              {!isOwner && (
                <div className="product-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => contactSeller({ productId: product.id }).catch((err) => setError(err.message))}>
                    <MessageIcon /> Nhắn tin cho người bán
                  </button>
                  {product.status === 'ACTIVE' && product.stock > 0 && !isAdmin && (
                    <button type="button" className="btn btn-secondary" onClick={handleAddToCart} disabled={busy}>
                      <CartIcon /> Thêm vào giỏ
                    </button>
                  )}
                  {product.status === 'ACTIVE' && product.stock > 0 && (
                    <Link to="/orders/new" state={{ product }} className="btn btn-primary">
                      Đặt mua ngay
                    </Link>
                  )}
                </div>
              )}
              {canManage && (
                <>
                  <p className="muted product-meta">
                    Đăng lúc {formatDate(product.createdAt)} · Cập nhật {formatDate(product.updatedAt)}
                  </p>
                  <div className="product-actions">
                    <Link to={`/products/${product.id}/edit`} state={{ product }} className="btn btn-secondary">
                      <EditIcon /> Sửa tin
                    </Link>
                    {(product.status === 'ACTIVE' || product.status === 'PENDING_REVIEW') && (
                      <button type="button" className="btn btn-secondary" onClick={() => setVisible(false)} disabled={busy}>
                        Ẩn tin
                      </button>
                    )}
                    {product.status === 'INACTIVE' && (
                      <button type="button" className="btn btn-secondary" onClick={() => setVisible(true)} disabled={busy}>
                        {product.approved ? 'Hiện lại tin' : 'Gửi duyệt'}
                      </button>
                    )}
                    {isAdmin && product.status === 'ACTIVE' && (
                      <button type="button" className="btn btn-danger" onClick={reject} disabled={busy}>
                        Gỡ tin
                      </button>
                    )}
                    <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                      <TrashIcon /> {deleting ? 'Đang xoá…' : 'Xoá tin'}
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
              <EyeIcon size={14} /> Sản phẩm bạn mở được lưu trong <Link to="/history">lịch sử xem</Link>.
            </p>
          )}
        </>
      )}
    </div>
  );
}
