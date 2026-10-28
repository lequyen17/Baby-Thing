import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

function Loading() {
  return <div className="page-center muted">Loading...</div>;
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

/** Trang chỉ dành cho ADMIN (tạo/sửa sản phẩm); đặt bên trong ProtectedRoute. */
export function AdminRoute() {
  const { user } = useAuth();
  return user?.role === 'ADMIN' ? <Outlet /> : <Navigate to="/products" replace />;
}
