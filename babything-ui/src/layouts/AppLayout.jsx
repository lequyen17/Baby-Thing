import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  CameraIcon,
  CardIcon,
  CheckSquareIcon,
  LogoMark,
  MessageIcon,
  OrderIcon,
  PlusIcon,
  SearchIcon,
} from '../components/Icons';
import { useUnreadMessages } from '../messages/useMessages';
import { useRealtime } from '../realtime/useRealtime';
import NotificationBell from '../notifications/NotificationBell';
import { POLICY_LIST } from '../content/pages';
import { UserMenu } from '../components/UserMenu';

/** Khung chung cho các trang sau khi đăng nhập: thanh thông báo, header, danh mục, nội dung, footer. */
export default function AppLayout() {
  const { user } = useAuth();
  const isAdmin = user.role === 'ADMIN';
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const activeCategory = params.get('category') ?? '';
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [categories, setCategories] = useState([]);
  useRealtime(user.id);
  const unreadMessages = useUnreadMessages(user.id);

  useEffect(() => {
    api('/products/categories')
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `/products?${new URLSearchParams({ q })}` : '/products');
  };

  return (
    <div className="app-shell">
      <div className="announce-bar">
        <span>Mua – Bán đồ mẹ &amp; bé đã qua sử dụng, tiết kiệm và bền vững</span>
        <Link to="/#how">Tìm hiểu cách hoạt động</Link>
      </div>

      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="brand">
            <LogoMark />
            <span>Baby Things</span>
          </Link>

          <form className="header-search" onSubmit={handleSearch} role="search">
            <SearchIcon size={20} />
            <input
              type="search"
              placeholder="Tìm xe đẩy, ghế ăn, quần áo sơ sinh…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Tìm kiếm sản phẩm"
            />
            <Link to="/image-search" className="header-search-camera" aria-label="Tìm bằng hình ảnh (AI nhận diện)">
              <CameraIcon size={20} />
            </Link>
            <button type="submit" className="btn btn-dark btn-sm">
              Tìm kiếm
            </button>
          </form>

          <nav className="app-nav" aria-label="Tài khoản">
            <NavLink to="/messages" className="app-nav-link">
              <span className="nav-icon">
                <MessageIcon size={24} />
                {unreadMessages > 0 && <span className="nav-badge">{unreadMessages > 9 ? '9+' : unreadMessages}</span>}
              </span>
              <span>Tin nhắn</span>
            </NavLink>
            <NotificationBell />
            <NavLink to="/orders" className="app-nav-link">
              <OrderIcon size={24} /> <span>Đơn hàng</span>
            </NavLink>
            <NavLink to="/payments" className="app-nav-link">
              <CardIcon size={24} /> <span>Thanh toán</span>
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className="app-nav-link">
                <CheckSquareIcon size={24} /> <span>Quản trị</span>
              </NavLink>
            )}
          </nav>

          <Link to="/products/new" className="btn btn-accent header-sell">
            <PlusIcon /> <span>Đăng bán</span>
          </Link>
          <UserMenu />
        </div>
      </header>

      {categories.length > 0 && (
        <nav className="category-bar" aria-label="Danh mục">
          <div className="category-bar-inner">
            <Link to="/products" className={pathname === '/products' && !activeCategory ? 'is-active' : undefined}>
              Mới đăng
            </Link>
            {categories.map((c) => (
              <Link
                key={c}
                to={`/products?${new URLSearchParams({ category: c })}`}
                className={pathname === '/products' && activeCategory === c ? 'is-active' : undefined}
              >
                {c}
              </Link>
            ))}
          </div>
        </nav>
      )}

      <main className="app-main">
        <Outlet context={{ categories }} />
      </main>

      <footer className="app-footer">
        <div className="app-footer-grid">
          <div className="footer-brand">
            <span className="serif">Baby Things</span>
            <p>Nền tảng C2C mua bán đồ mẹ &amp; bé đã qua sử dụng.</p>
            <NewsletterForm />
          </div>
          <div className="footer-col">
            <strong>Tài khoản</strong>
            <Link to="/profile">Hồ sơ của tôi</Link>
            <Link to="/orders">Đơn mua &amp; đơn bán</Link>
            <Link to="/payments">Lịch sử thanh toán</Link>
            <Link to="/messages">Tin nhắn</Link>
            <Link to="/history">Sản phẩm đã xem</Link>
            <Link to="/profile/addresses">Sổ địa chỉ</Link>
            <Link to="/settings">Bảo mật</Link>
          </div>
          <div className="footer-col">
            <strong>Mua &amp; bán</strong>
            <Link to="/products">Tin mới đăng</Link>
            <Link to="/products/new">Đăng bán</Link>
            <Link to="/products?mine=1">Tin đăng của tôi</Link>
            <Link to="/sales">Doanh thu bán hàng</Link>
            {isAdmin && <Link to="/admin/products">Duyệt tin đăng</Link>}
          </div>
          <div className="footer-col">
            <strong>Hỗ trợ</strong>
            <Link to="/#how">Cách hoạt động</Link>
            <Link to="/guide/buy">Hướng dẫn mua</Link>
            <Link to="/guide/sell">Hướng dẫn bán</Link>
            <Link to="/fees">Bảng phí</Link>
            <Link to="/faq">Câu hỏi thường gặp</Link>
            <Link to="/feedback">Gửi góp ý</Link>
            {POLICY_LIST.map((p) => (
              <Link key={p.key} to={p.path}>
                {p.title}
              </Link>
            ))}
          </div>
        </div>
        <div className="app-footer-bottom">© {new Date().getFullYear()} Baby Things.</div>
      </footer>
    </div>
  );
}

/** Ô đăng ký nhận tin: chưa có backend nên chỉ báo "sắp ra mắt". */
function NewsletterForm() {
  const [sent, setSent] = useState(false);
  return (
    <form
      className="newsletter"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <label htmlFor="newsletter-email">Nhận thông báo tin đăng mới</label>
      <div className="newsletter-row">
        <input id="newsletter-email" type="email" required placeholder="Email của bạn" />
        <button type="submit" className="btn">
          Đăng ký
        </button>
      </div>
      {sent && <small>Tính năng sắp ra mắt — cảm ơn bạn đã quan tâm!</small>}
    </form>
  );
}
