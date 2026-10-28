import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { HistoryIcon, LogoMark, PackageIcon, PlusIcon, ReceiptIcon, SearchIcon } from '../components/Icons';
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
            <button type="submit" className="btn btn-dark btn-sm">
              Tìm kiếm
            </button>
          </form>

          <nav className="app-nav" aria-label="Tài khoản">
            <NavLink to="/products" end className="app-nav-link">
              <PackageIcon size={24} /> <span>Sản phẩm</span>
            </NavLink>
            <NavLink to="/orders" className="app-nav-link">
              <ReceiptIcon size={24} /> <span>Đơn hàng</span>
            </NavLink>
            <NavLink to="/history" className="app-nav-link">
              <HistoryIcon size={24} /> <span>Đã xem</span>
            </NavLink>
          </nav>

          {isAdmin && (
            <Link to="/products/new" className="btn btn-accent header-sell">
              <PlusIcon /> <span>Đăng bán</span>
            </Link>
          )}
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
          </div>
          <div className="footer-col">
            <strong>Tài khoản</strong>
            <Link to="/profile">Hồ sơ của tôi</Link>
            <Link to="/settings">Đổi mật khẩu</Link>
            <Link to="/history">Sản phẩm đã xem</Link>
          </div>
          <div className="footer-col">
            <strong>Mua &amp; bán</strong>
            <Link to="/products">Tin mới đăng</Link>
            <Link to="/orders">Đơn hàng của tôi</Link>
            {isAdmin && <Link to="/products/new">Đăng bán sản phẩm</Link>}
          </div>
          <div className="footer-col">
            <strong>Hỗ trợ</strong>
            <Link to="/#how">Cách hoạt động</Link>
          </div>
        </div>
        <div className="app-footer-bottom">© {new Date().getFullYear()} Baby Things.</div>
      </footer>
    </div>
  );
}
