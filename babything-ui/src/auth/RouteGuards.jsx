import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

function Loading() {
  return <div className="page-center muted">Đang tải…</div>;
}

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

/** Trang dành cho khách (login, register...): đã đăng nhập thì chuyển về trang chủ. */
export function GuestRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return user ? <Navigate to="/" replace /> : <Outlet />;
}
