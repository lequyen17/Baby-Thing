import { useCallback } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { loadReturnTo, saveReturnTo } from '../pages/flowStorage';
import { useAuth } from './AuthContext';

export function Loading() {
  return <div className="page-center muted">Đang tải…</div>;
}

const currentPath = (location) => location.pathname + location.search;

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (user) return <Outlet />;
  saveReturnTo(currentPath(location));
  return <Navigate to="/login" replace />;
}

/** Trang dành cho khách (login, register...): đã đăng nhập thì quay về trang đang xem dở, mặc định trang chủ. */
export function GuestRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return user ? <Navigate to={loadReturnTo()} replace /> : <Outlet />;
}

/**
 * Thao tác cần tài khoản (mua, nhắn tin, thêm giỏ) bấm từ trang công khai:
 * khách thì chuyển tới đăng nhập và nhớ trang hiện tại để quay lại; thành viên thì chạy luôn.
 */
export function useRequireLogin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(
    (action) => {
      if (user) return action?.();
      saveReturnTo(currentPath(location));
      navigate('/login');
      return undefined;
    },
    [user, navigate, location],
  );
}
