import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useExtraProfile } from '../account/useAccountData';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { CalendarIcon, MapPinIcon, MessageIcon, ShieldCheckIcon, StarIcon } from '../components/Icons';
import { ProductCard } from '../components/ProductCard';
import { useMessages } from '../messages/useMessages';
import { formatDate } from '../utils/format';

/** Hồ sơ công khai chưa có API: người bán khác dùng dữ liệu mẫu, hồ sơ của chính mình lấy từ tài khoản. */
const DEMO_SELLERS = {
  'demo-mai-anh': { name: 'Mai Anh', district: 'Cầu Giấy', bio: 'Mẹ bé 18 tháng. Đồ giặt kỹ, phơi nắng, ảnh thật 100%.', rating: 4.9, reviews: 38, deals: 52, complaintRate: 0, joined: '2025-03-12' },
  'demo-thu-ha': { name: 'Thu Hà', district: 'Hai Bà Trưng', bio: 'Chuyên đồ sơ sinh, còn nhiều bộ như mới.', rating: 4.7, reviews: 14, deals: 19, complaintRate: 2.1, joined: '2025-08-02' },
};

const MIN_REVIEWS = 3; // FR-FB-06: dưới 3 đánh giá hiển thị "Seller mới"

function Stat({ value, label }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

/** FR-USER-10: điểm đánh giá, số giao dịch hoàn tất, tỉ lệ khiếu nại, ngày tham gia, huy hiệu, tin đang bán. */
export default function SellerProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { open } = useMessages(user.id);
  const [extra] = useExtraProfile(user.id);
  // { items, totalItems } của tin đang hiện của người bán này
  const [products, setProducts] = useState(null);

  const isMe = String(user.id) === id;
  const seller = isMe
    ? { name: user.displayName, avatarUrl: user.avatarUrl, district: extra.district, bio: extra.bio, rating: 0, reviews: 0, deals: 0, complaintRate: 0, joined: user.createdAt, verified: Boolean(user.emailVerifiedAt) }
    : DEMO_SELLERS[id] && { ...DEMO_SELLERS[id], verified: true };

  useEffect(() => {
    const empty = { items: [], totalItems: 0 };
    // Người bán mẫu (id dạng demo-...) không có tài khoản thật nên không có tin
    if (!/^\d+$/.test(id)) {
      setProducts(empty);
      return;
    }
    setProducts(null);
    // status=ACTIVE: admin xem hồ sơ cũng chỉ thấy tin đang bán như khách
    const query = new URLSearchParams({ sellerId: id, status: 'ACTIVE', sort: 'newest', page: '0', size: '8' });
    api(`/products?${query}`)
      .then(setProducts)
      .catch(() => setProducts(empty));
  }, [id]);

  if (!seller) {
    return (
      <div className="card empty-block">
        <strong>Không tìm thấy người bán</strong>
        <p className="muted">Hồ sơ này không tồn tại hoặc đã bị ẩn.</p>
        <Link to="/products" className="btn btn-primary">
          Về trang sản phẩm
        </Link>
      </div>
    );
  }

  const isNew = seller.reviews < MIN_REVIEWS;
  const startChat = () => navigate(`/messages/${open({ id, name: seller.name }, null)}`);

  return (
    <div className="page">
      <section className="card seller-hero">
        <Avatar user={{ displayName: seller.name, avatarUrl: seller.avatarUrl }} size={96} />
        <div className="seller-hero-body">
          <h1>{seller.name}</h1>
          <div className="badges">
            {isNew ? <span className="badge">Seller mới</span> : <span className="badge badge-success">Người bán uy tín</span>}
            {seller.verified && (
              <span className="badge badge-muted">
                <ShieldCheckIcon size={14} /> Đã xác minh
              </span>
            )}
          </div>
          <p className="seller-meta">
            {seller.district && (
              <span>
                <MapPinIcon size={16} /> {seller.district}, Hà Nội
              </span>
            )}
            <span>
              <CalendarIcon size={16} /> Tham gia {formatDate(seller.joined, true)}
            </span>
          </p>
          <p className="seller-bio">{seller.bio || (isMe ? 'Bạn chưa viết giới thiệu.' : 'Người bán chưa có giới thiệu.')}</p>
        </div>
        <div className="seller-cta">
          {isMe ? (
            <Link to="/profile" className="btn btn-secondary">
              Chỉnh sửa hồ sơ
            </Link>
          ) : (
            <button type="button" className="btn btn-accent" onClick={startChat}>
              <MessageIcon size={18} /> Nhắn tin
            </button>
          )}
        </div>
      </section>

      <section className="stat-grid">
        <div className="stat">
          <strong>
            <StarIcon size={18} /> {isNew ? '—' : seller.rating.toFixed(1)}
          </strong>
          <span>{seller.reviews > 0 ? `${seller.reviews} đánh giá` : 'Chưa có đánh giá'}</span>
        </div>
        <Stat value={seller.deals} label="Giao dịch hoàn tất" />
        <Stat value={`${seller.complaintRate}%`} label="Tỉ lệ khiếu nại được chấp nhận" />
        <Stat value={products?.totalItems ?? '…'} label="Tin đang bán" />
      </section>

      <section>
        <div className="section-head">
          <h2 className="section-title">Tin đang bán</h2>
        </div>
        {products === null ? (
          <p className="muted">Đang tải…</p>
        ) : products.items.length === 0 ? (
          <div className="card empty-block">
            <strong>Chưa có tin đang bán</strong>
          </div>
        ) : (
          <div className="product-grid">
            {products.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
