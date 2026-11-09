import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { Alert } from '../components/Form';
import { ProductCard } from '../components/ProductCard';
import { categoryArt } from '../utils/categoryArt';

const FILTERS = [
  ['all', 'Mới nhất'],
  ['in', 'Còn hàng'],
  ['low', 'Sắp hết'],
];

const PROMISES = [
  ['Tài khoản xác minh', 'Người bán được quản lý và có thể bị khoá khi vi phạm.'],
  ['Thanh toán an toàn', 'Giá niêm yết rõ ràng cho từng sản phẩm.'],
  ['Lưu lịch sử xem', 'Xem lại những món bạn đã quan tâm bất cứ lúc nào.'],
  ['Hàng chọn lọc', 'Mỗi tin đăng đều có danh mục, mô tả và tồn kho minh bạch.'],
];

const CARE_PERKS = [
  ['Tiết kiệm thời gian', 'Không cần tự chụp ảnh, viết bài hay đăng bán từng món. BabyThings hỗ trợ bạn thực hiện những công việc đó.'],
  ['Chăm sóc trước khi bán', 'Sản phẩm được kiểm tra tình trạng, làm sạch và chụp ảnh thực tế, giúp người mua có thêm thông tin để yên tâm lựa chọn.'],
  ['Đồ cũ vẫn còn giá trị', 'Biến những món đồ bé không còn sử dụng thành cơ hội thu lại một phần chi phí, thay vì để chúng bị lãng phí.'],
];

const CARE_STEPS = [
  ['Bạn đăng ký gửi đồ', 'Chọn những món đồ còn tốt mà bé không còn sử dụng và đăng ký ký gửi.'],
  ['BabyThings chăm sóc sản phẩm', 'Chúng mình kiểm tra, làm sạch, chụp ảnh và chuẩn bị thông tin sản phẩm.'],
  ['BabyThings đăng bán giúp bạn', 'Sản phẩm được đăng bán với nhãn Renewed. Bạn vẫn là chủ sở hữu cho đến khi món đồ được bán thành công.'],
];

const CARE_TERMS = [
  ['Nhận từ 1–5 món/lô', 'Áp dụng cho quần áo, đồ vải có thể giặt với giá trị lô từ 250.000đ.'],
  ['Hoa hồng 10% khi bán thành công', 'Cộng phí làm sạch được thông báo và thanh toán trước khi thực hiện. Tổng phí không vượt quá 30% giá bán.'],
  ['Thời gian ký gửi 60 ngày', 'Từ ngày 45, sản phẩm có thể được giảm về giá sàn đã thỏa thuận. Sau 60 ngày, bạn có thể gia hạn thêm 30 ngày hoặc nhận lại đồ chưa bán.'],
];

const AI_STEPS = [
  ['Nhận diện sản phẩm', 'Tải ảnh lên, AI tự nhận biết loại sản phẩm, danh mục và tình trạng sử dụng.'],
  ['Tạo bài đăng tự động', 'Tiêu đề, mô tả và thông tin chi tiết được soạn sẵn — bạn chỉ cần xem lại và chỉnh sửa.'],
  ['Gợi ý giá hợp lý', 'Đề xuất khoảng giá phù hợp dựa trên tình trạng và các tin đăng tương tự.'],
];

export default function HomePage() {
  const { hash } = useLocation();
  const [products, setProducts] = useState(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [covers, setCovers] = useState([]);

  useEffect(() => {
    api('/products?sort=newest&page=0&size=20')
      .then((data) => setProducts(data.items))
      .catch((err) => setError(err.message));
    // Ảnh và số liệu trên banner chỉ để trang trí: lỗi thì ẩn đi, không báo
    api('/products/categories/covers')
      .then(setCovers)
      .catch(() => setCovers([]));
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
  const sellTo = '/products/new';
  // Banner: vài ảnh đại diện danh mục + tổng số tin, lấy từ cùng dữ liệu covers
  const photos = covers.filter((c) => c.imageUrl).slice(0, 5);
  const totalListings = covers.reduce((sum, c) => sum + c.count, 0);
  // Ảnh minh hoạ cho thẻ trợ lý AI: lấy ảnh danh mục xe đẩy nếu có, khớp với nội dung ví dụ
  const demoPhoto = covers.find((c) => c.imageUrl && /stroll|xe đẩy|xe day/i.test(c.category))?.imageUrl;

  return (
    <div className="home">
      <div className="home-feed">
        <section className="home-banner">
          <div className="home-banner-copy">
            <h2>Điều nhỏ cho bé, An tâm cho mẹ</h2>
            <p>Mẹ cứ yên tâm chọn đồ cho bé, mỗi món đều được chúng mình xem qua trước khi lên kệ.</p>
            <div className="home-banner-actions">
              <Link to={sellTo} className="btn btn-accent">
                Đăng bán
              </Link>
              <Link to="/products" className="btn btn-outline">
                Khám phá tin đăng
              </Link>
            </div>
          </div>
          {covers.length > 0 && (
            <div className="home-banner-side">
              <div className="home-banner-photos" aria-hidden="true">
                {photos.map(({ category, imageUrl }) => (
                  <span key={category} style={{ background: categoryArt(category).tint }}>
                    <img src={imageUrl} alt="" loading="lazy" />
                  </span>
                ))}
              </div>
              <dl className="home-banner-stats">
                <div>
                  <dt>{totalListings}</dt>
                  <dd>tin đang bán</dd>
                </div>
                <div>
                  <dt>{covers.length}</dt>
                  <dd>danh mục</dd>
                </div>
              </dl>
            </div>
          )}
        </section>

        <section className="home-panel" aria-label="Tin đăng">
          <div className="feed-tabs" role="tablist" aria-label="Lọc tin đăng">
            {FILTERS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                className={`feed-tab ${filter === id ? 'is-active' : ''}`}
                aria-selected={filter === id}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
            <Link to="/products" className="feed-tabs-more">
              Xem tất cả
            </Link>
          </div>
          <Alert>{error}</Alert>
          {!products && !error && <p className="muted">Đang tải…</p>}
          {products && shown.length === 0 && <p className="muted empty-state">Chưa có sản phẩm phù hợp.</p>}
          {shown.length > 0 && (
            <div className="product-grid product-grid-5">
              {shown.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
          <Link to="/products" className="btn btn-outline btn-lg section-more">
            Xem thêm tin đăng
          </Link>
        </section>
      </div>

      <section id="how" className="ai-band">
        <div className="ai-band-copy">
          <span className="ai-band-kicker">Trợ lý AI của Baby Things</span>
          <h2 className="serif">Chụp một tấm ảnh, phần còn lại để AI lo.</h2>
          <p className="ai-band-lead">
            Quần áo, xe đẩy, ghế ăn, nôi cũi hay đồ chơi bé không còn dùng — đăng bán trong vài phút, tiết kiệm hơn
            cho bố mẹ, nhẹ nhàng hơn cho môi trường.
          </p>
          <ol className="ai-steps">
            {AI_STEPS.map(([title, text]) => (
              <li key={title}>
                <strong>{title}</strong>
                <span>{text}</span>
              </li>
            ))}
          </ol>
          <div className="ai-band-actions">
            <Link to={sellTo} className="btn btn-cream btn-lg">
              Thử đăng bán với AI
            </Link>
            <Link to="/products" className="btn btn-ghost-light btn-lg">
              Mua sắm ngay
            </Link>
          </div>
        </div>

        <div className="hero-card">
          <div className="hero-card-head">
            <strong>Trợ lý đăng bán</strong>
            <span className="muted">Ví dụ minh hoạ</span>
          </div>
          <div className="hero-card-body">
            <div className={`hero-card-photo ${demoPhoto ? 'has-photo' : ''}`}>
              {demoPhoto ? <img src={demoPhoto} alt="" loading="lazy" /> : <span>Ảnh của bạn</span>}
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
            Đăng bài ngay
          </Link>
        </div>
      </section>

      <section className="promise-grid" aria-label="Cam kết">
        {PROMISES.map(([title, text]) => (
          <div key={title} className="promise">
            <strong>{title}</strong>
            <span>{text}</span>
          </div>
        ))}
      </section>

      <section id="care" className="care-intro">
        <div className="care-intro-head">
          <span className="care-intro-kicker">BabyThings Care</span>
          <h2 className="serif">Đồ con không dùng nữa? Để BabyThings bán giúp bạn!</h2>
          <p>
            Quần áo con mặc vài lần đã chật? Nhiều món vẫn còn tốt nhưng bạn không có thời gian chụp ảnh, đăng bán hay
            tìm người mua? <strong>Đừng để những món đồ còn giá trị nằm mãi trong tủ!</strong>
          </p>
          <p>
            Với BabyThings Care, bạn chỉ cần đăng ký ký gửi. Chúng mình sẽ hỗ trợ kiểm tra, làm sạch, chụp ảnh và đăng
            bán giúp bạn.
          </p>
        </div>

        <h3 className="care-intro-title">Nhẹ việc cho mẹ, thêm giá trị cho đồ của bé!</h3>
        <div className="care-perks">
          {CARE_PERKS.map(([title, text]) => (
            <div key={title} className="care-perk">
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          ))}
        </div>

        <h3 className="care-intro-title">Ký gửi dễ dàng chỉ với 3 bước</h3>
        <ol className="care-steps">
          {CARE_STEPS.map(([title, text], i) => (
            <li key={title}>
              <span className="care-step-no">{String(i + 1).padStart(2, '0')}</span>
              <strong>{title}</strong>
              <span>{text}</span>
            </li>
          ))}
        </ol>

        <h3 className="care-intro-title">Phí rõ ràng, bạn chủ động quyết định</h3>
        <dl className="care-terms">
          {CARE_TERMS.map(([title, text]) => (
            <div key={title}>
              <dt>{title}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>

        <div className="care-cta">
          <div>
            <h3 className="serif">Đồ bé đã lớn, hãy để giá trị tiếp tục!</h3>
            <p>Đăng ký ký gửi ngay để BabyThings giúp bạn chăm sóc và tìm người mua cho những món đồ còn tốt.</p>
          </div>
          <Link to="/care/new" className="btn btn-cream btn-lg">
            Để BabyThings bán giúp tôi
          </Link>
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
