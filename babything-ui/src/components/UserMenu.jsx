import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from './Avatar';
import { BankIcon, BellIcon, ChevronDownIcon, HistoryIcon, MapPinIcon, LogoutIcon, ReceiptIcon, SettingsIcon, UserIcon } from './Icons';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const location = useLocation();

  // Đóng menu khi chuyển trang, bấm ra ngoài hoặc nhấn Esc
  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={containerRef}>
      <button
        type="button"
        className="user-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar user={user} size={32} />
        <span className="user-menu-name">{user.displayName}</span>
        <ChevronDownIcon size={16} />
      </button>

      {open && (
        <div className="user-menu-dropdown" role="menu">
          <div className="user-menu-header">
            <Avatar user={user} size={40} />
            <div className="user-menu-identity">
              <strong>{user.displayName}</strong>
              <span>{user.email}</span>
            </div>
          </div>
          <NavLink to="/profile" className="user-menu-item" role="menuitem">
            <UserIcon /> Hồ sơ của tôi
          </NavLink>
          <NavLink to="/profile/addresses" className="user-menu-item" role="menuitem">
            <MapPinIcon /> Sổ địa chỉ
          </NavLink>
          <NavLink to="/profile/payout" className="user-menu-item" role="menuitem">
            <BankIcon /> Tài khoản nhận tiền
          </NavLink>
          <NavLink to="/sales" className="user-menu-item" role="menuitem">
            <ReceiptIcon /> Doanh thu bán hàng
          </NavLink>
          <NavLink to="/profile/notifications" className="user-menu-item" role="menuitem">
            <BellIcon /> Cài đặt thông báo
          </NavLink>
          <NavLink to="/history" className="user-menu-item" role="menuitem">
            <HistoryIcon /> Sản phẩm đã xem
          </NavLink>
          <NavLink to="/settings" className="user-menu-item" role="menuitem">
            <SettingsIcon /> Bảo mật
          </NavLink>
          <div className="user-menu-divider" />
          <button type="button" className="user-menu-item user-menu-item-danger" role="menuitem" onClick={signOut}>
            <LogoutIcon /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
