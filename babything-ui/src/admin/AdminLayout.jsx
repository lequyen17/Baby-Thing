import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { BankIcon, CardIcon, CheckSquareIcon, OrderIcon } from '../components/Icons';
import { formatPrice } from '../utils/format';

/** Khu vực quản trị; server chặn /api/admin/** và các thao tác kiểm duyệt với người không phải ADMIN. */
export default function AdminLayout() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  // Trang con gọi refresh() sau khi duyệt tin / chi trả để số trên tab cập nhật
  const [version, setVersion] = useState(0);
  const isAdmin = user.role === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      api('/products/review-count'),
      api('/admin/payments/summary'),
      api('/admin/settlements/summary'),
    ])
      .then(([review, payments, settlements]) => setStats({ review, payments, settlements }))
      .catch(() => setStats(null));
  }, [isAdmin, version]);

  if (!isAdmin) return <Navigate to="/" replace />;

  const tabs = [
    ['/admin/products', 'Duyệt tin', CheckSquareIcon, stats?.review.pending],
    ['/orders', 'Đơn hàng', OrderIcon],
    ['/admin/payments', 'Thanh toán', CardIcon],
    ['/admin/settlements', 'Chi trả người bán', BankIcon, stats?.settlements.pendingCount],
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Quản trị sàn</h1>
        <p className="muted">Kiểm duyệt tin đăng, theo dõi thanh toán và chi trả tiền bán hàng cho người bán.</p>
      </div>
      <section className="stat-grid payment-stats">
        <div className="stat">
          <strong>{stats ? stats.review.pending : '…'}</strong>
          <span>Tin chờ duyệt</span>
        </div>
        <div className="stat">
          <strong>{stats ? formatPrice(stats.payments.totalPaid) : '…'}</strong>
          <span>Đã thu qua cổng ({stats?.payments.paidCount ?? 0} giao dịch)</span>
        </div>
        <div className="stat">
          <strong>{stats ? formatPrice(stats.settlements.pendingAmount) : '…'}</strong>
          <span>Chờ chi trả người bán ({stats?.settlements.pendingCount ?? 0})</span>
        </div>
        <div className="stat">
          <strong>{stats ? formatPrice(stats.settlements.commissionTotal) : '…'}</strong>
          <span>Doanh thu hoa hồng</span>
        </div>
      </section>
      <nav className="segmented admin-tabs" aria-label="Quản trị">
        {tabs.map(([to, label, Icon, count]) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
            <Icon size={16} /> {label}
            {count > 0 && <span className="nav-count">{count}</span>}
          </NavLink>
        ))}
      </nav>
      <Outlet context={{ refresh: () => setVersion((v) => v + 1) }} />
    </div>
  );
}
