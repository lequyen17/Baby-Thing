import { useEffect, useState } from 'react';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Alert } from '../components/Form';
import {
  ArrowRightIcon,
  CameraIcon,
  CardIcon,
  HistoryIcon,
  PenIcon,
  ShieldCheckIcon,
  SparkleIcon,
  StarIcon,
  TagIcon,
} from '../components/Icons';
import { ProductCard } from '../components/ProductCard';
import { CategoryGlyph, categoryArt } from '../utils/categoryArt';

const FILTERS = [
  ['all', 'Tất cả'],
  ['in', 'Còn hàng'],
  ['low', 'Sắp hết'],
];

const PROMISES = [
  [ShieldCheckIcon, 'sage', 'Tài khoản xác minh', 'Người bán được quản lý và có thể bị khoá khi vi phạm.'],
  [CardIcon, 'peach', 'Thanh toán an toàn', 'Giá niêm yết rõ ràng cho từng sản phẩm.'],
  [HistoryIcon, 'butter', 'Lưu lịch sử xem', 'Xem lại những món bạn đã quan tâm bất cứ lúc nào.'],
  [StarIcon, 'sky', 'Hàng chọn lọc', 'Mỗi tin đăng đều có danh mục, mô tả và tồn kho minh bạch.'],
];

const AI_STEPS = [
  [CameraIcon, 'Nhận diện sản phẩm', 'Tải ảnh lên, AI tự nhận biết loại sản phẩm, danh mục và tình trạng sử dụng.'],
  [PenIcon, 'Tạo bài đăng tự động', 'Tiêu đề, mô tả và thông tin chi tiết được soạn sẵn — bạn chỉ cần xem lại và chỉnh sửa.'],
  [TagIcon, 'Gợi ý giá hợp lý', 'Đề xuất khoảng giá phù hợp dựa trên tình trạng và các tin đăng tương tự.'],
];

export default function HomePage() {
  const { user } = useAuth();
  const isAdmin = user.role === 'ADMIN';
  const { categories } = useOutletContext();
  const { hash } = useLocation();
  const [products, setProducts] = useState(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/products?sort=newest&page=0&size=8')
      .then((data) => setProducts(data.items))
      .catch((err) => setError(err.message));
  }, []);

  // Link dạng "/#how" từ header/footer: cuộn tới đúng mục
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [hash]);

  const shown = (products ?? []).filter((p) => {
    if (filter === 'in') return p.stock > 5;
    if (filter === 'low') return p.stock > 0 && p.stock <= 5;
    return true;
  });
  const sellTo = isAdmin ? '/products/new' : '/sell';

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <span className="pill pill-sage">
            <SparkleIcon size={16} /> Đăng bán nhanh với trợ lý AI
          </span>
          <h1 className="serif hero-title">
            Đồ tốt cho bé,
            <br />
            trao tay lần hai
            <br />
            vẫn trọn vẹn.
          </h1>
          <p className="hero-lead">
            Nơi các gia đình mua, bán quần áo, xe đẩy, ghế ăn, nôi cũi và đồ chơi còn dùng tốt — tiết kiệm hơn cho
            bố mẹ, nhẹ nhàng hơn cho môi trường.
          </p>
          <div className="hero-actions">
            <Link to="/products" className="btn btn-accent btn-lg">
              Mua sắm ngay <ArrowRightIcon />
            </Link>
            <Link to={sellTo} className="btn btn-outline btn-lg">
              Bán đồ bé đã dùng
            </Link>
          </div>
        </div>

        <div className="hero-card">
          <div className="hero-card-head">
            <strong>Trợ lý đăng bán</strong>
            <span className="muted">Ví dụ minh hoạ</span>
          </div>
          <div className="hero-card-body">
            <div className="hero-card-photo">
              <CategoryGlyph category="stroller" size={104} />
              <span>Ảnh của bạn</span>
            </div>
            <dl className="hero-card-steps">
              <div>
                <dt>1 · Nhận diện sản phẩm</dt>
                <dd>Xe đẩy gấp gọn du lịch</dd>
              </div>
              <div>
                <dt>2 · Tình trạng ước tính</dt>
                <dd>Như mới · ít vết sử dụng</dd>
              </div>
              <div>
                <dt>3 · Giá gợi ý</dt>
                <dd className="serif hero-card-price">1.200.000 – 1.450.000đ</dd>
              </div>
            </dl>
          </div>
          <div className="hero-card-draft">
            <strong>Bài đăng được soạn sẵn</strong>
            Xe đẩy gấp gọn, khung nhẹ, mái che rộng, gấp một tay. Dùng khoảng 6 tháng, đầy đủ phụ kiện…
          </div>
          <Link to={sellTo} className="btn btn-dark btn-block">
            <PenIcon /> Đăng bài ngay
          </Link>
        </div>
      </section>

      <section className="promise-grid" aria-label="Cam kết">
        {PROMISES.map(([Icon, tone, title, text]) => (
          <div key={title} className="promise">
            <span className={`promise-icon tone-${tone}`}>
              <Icon size={22} />
            </span>
            <div>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          </div>
        ))}
      </section>

      {categories.length > 0 && (
        <section className="home-section">
          <div className="section-head">
            <h2 className="serif section-title">Mua theo danh mục</h2>
            <Link to="/products" className="section-link">
              Tất cả danh mục
            </Link>
          </div>
          <div className="category-grid">
            {categories.map((c) => (
              <Link
                key={c}
                to={`/products?${new URLSearchParams({ category: c })}`}
                className="category-tile"
                style={{ background: categoryArt(c).tint }}
              >
                <CategoryGlyph category={c} />
                <span>{c}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="home-section">
        <div className="section-head">
          <div>
            <h2 className="serif section-title">Mới đăng gần đây</h2>
            <p className="muted">Tin đăng từ các gia đình quanh bạn</p>
          </div>
          <div className="chip-group" role="group" aria-label="Lọc theo tồn kho">
            {FILTERS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`chip ${filter === id ? 'is-active' : ''}`}
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <Alert>{error}</Alert>
        {!products && !error && <p className="muted">Đang tải…</p>}
        {products && shown.length === 0 && <p className="muted empty-state">Chưa có sản phẩm phù hợp.</p>}
        {shown.length > 0 && (
          <div className="product-grid product-grid-4">
            {shown.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
        <Link to="/products" className="btn btn-outline btn-lg section-more">
          Xem thêm tin đăng
        </Link>
      </section>

      <section id="sell" className="sell-band">
        <div className="sell-band-head">
          <div>
            <span className="sell-band-kicker">
              <SparkleIcon size={16} /> Trợ lý AI của Baby Things
            </span>
            <h2 className="serif">Chụp một tấm ảnh, phần còn lại để AI lo.</h2>
          </div>
          <Link to={sellTo} className="btn btn-cream btn-lg">
            Thử đăng bán với AI <ArrowRightIcon />
          </Link>
        </div>
        <div className="sell-steps">
          {AI_STEPS.map(([Icon, title, text], i) => (
            <div key={title} className="sell-step">
              <span className="sell-step-icon">
                <Icon size={26} />
              </span>
              <span className="sell-step-no">Bước {i + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="home-section">
        <h2 className="serif section-title text-center">Mua hay bán — đều đơn giản</h2>
        <div className="how-grid">
          <div className="how-card">
            <span className="serif how-title accent">Mua</span>
            <p>
              Tìm theo danh mục hoặc từ khoá, xem chi tiết tình trạng và giá, lưu lại lịch sử những món đã xem để
              quay lại so sánh.
            </p>
            <Link to="/products">Bắt đầu mua sắm</Link>
          </div>
          <div className="how-card">
            <span className="serif how-title sage">Bán</span>
            <p>
              Đăng tin nhanh, quản lý sản phẩm đang bán, cập nhật giá và tồn kho, theo dõi ai đã xem sản phẩm của bạn.
            </p>
            <Link to={sellTo}>Đăng bán sản phẩm</Link>
          </div>
        </div>
      </section>

      <section className="feedback-band">
        <div>
          <h2 className="serif">Góp ý của bạn giúp Baby Things tốt hơn</h2>
          <p>
            Gặp vấn đề khi mua bán, hay có ý tưởng cho nền tảng? Gửi góp ý và theo dõi phản hồi của chúng tôi ngay
            trong tài khoản.
          </p>
        </div>
        <div className="feedback-actions">
          <Link to="/feedback" className="btn btn-dark btn-lg">
            Gửi góp ý
          </Link>
          <Link to="/feedback" className="btn btn-outline btn-lg">
            Góp ý của tôi
          </Link>
        </div>
      </section>
    </div>
  );
}
