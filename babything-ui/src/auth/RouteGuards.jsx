import { useCallback } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { loadReturnTo, saveReturnTo } from '../pages/flowStorage';
import { useAuth } from './AuthContext';
import { useLoginModal } from './LoginModal';

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
 * khách thì mở popup đăng nhập, xong chạy tiếp thao tác đó; thành viên thì chạy luôn.
 * Ngoài popup (trang không có header) thì chuyển tới /login và nhớ trang hiện tại để quay lại.
 */
export function useRequireLogin() {
  const { user } = useAuth();
  const openLogin = useLoginModal();
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(
    (action) => {
      if (user) return action?.();
      if (openLogin) {
        openLogin(action);
        return undefined;
      }
      saveReturnTo(currentPath(location));
      navigate('/login');
      return undefined;
    },
    [user, openLogin, navigate, location],
  );
}
