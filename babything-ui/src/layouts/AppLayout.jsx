import { Link, Outlet } from 'react-router-dom';
import { CheckSquareIcon } from '../components/Icons';
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
          <UserMenu />
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
