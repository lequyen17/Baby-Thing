import { Link, NavLink, Outlet } from 'react-router-dom';
import { CheckSquareIcon, HistoryIcon, PackageIcon } from '../components/Icons';
import { UserMenu } from '../components/UserMenu';

/** Khung chung cho các trang sau khi đăng nhập: header + nội dung. */
export default function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/profile" className="brand">
            <CheckSquareIcon size={22} />
            BabyThing
          </Link>
          <nav className="app-nav">
            <NavLink to="/products" className="app-nav-link" aria-label="Products">
              <PackageIcon /> <span>Products</span>
            </NavLink>
            <NavLink to="/history" className="app-nav-link" aria-label="View history">
              <HistoryIcon /> <span>History</span>
            </NavLink>
          </nav>
          <UserMenu />
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
