import { useEffect, useId, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { apiUpload } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { Alert } from '../components/Form';
import { BankIcon, BellIcon, CameraIcon, LockIcon, MapPinIcon, ShieldCheckIcon, UserIcon } from '../components/Icons';
import { formatDate } from '../utils/format';
import { useAddresses, useExtraProfile, usePayoutAccount } from './useAccountData';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

const TABS = [
  ['/profile', 'Hồ sơ', UserIcon, true],
  ['/profile/addresses', 'Sổ địa chỉ', MapPinIcon],
  ['/profile/payout', 'Nhận tiền', BankIcon],
  ['/profile/notifications', 'Thông báo', BellIcon],
  ['/settings', 'Bảo mật', LockIcon],
];

/** Khung chung của khu vực tài khoản: ảnh bìa, avatar, mức hoàn thiện hồ sơ và thanh tab. */
export default function AccountLayout() {
  const { user, setUser } = useAuth();
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [extra] = useExtraProfile(user.id);
  const [addresses] = useAddresses(user.id);
  const [payout] = usePayoutAccount(user.id);

  // Thông báo thành công tự ẩn sau vài giây
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(''), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  const checklist = [
    ['Ảnh đại diện', Boolean(user.avatarUrl)],
    ['Khu vực', Boolean(extra.district)],
    ['Giới thiệu ngắn', Boolean(extra.bio?.trim())],
    ['Địa chỉ nhận hàng', addresses.length > 0],
    ['Tài khoản nhận tiền', Boolean(payout)],
  ];
  const done = checklist.filter(([, ok]) => ok).length;
  const percent = Math.round((done / checklist.length) * 100);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setMessage('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      setUser(await apiUpload('/users/me/avatar', form));
      setMessage('Đã cập nhật ảnh đại diện.');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const ring = (
    <div className="profile-avatar-ring">
      <Avatar user={user} size={104} />
    </div>
  );

  return (
    <div className="page account">
      <section className="card profile-hero">
        <div className="profile-cover" />
        {(error || message) && (
          <div className="profile-avatar-alerts" role="status">
            <Alert>{error}</Alert>
            <Alert type="success">{message}</Alert>
          </div>
        )}
        <div className="profile-hero-body">
          {user.avatarUploadEnabled ? (
            <>
              <input id={inputId} type="file" accept={ACCEPT} className="visually-hidden" onChange={handleFile} disabled={uploading} />
              <label htmlFor={inputId} className={`profile-avatar-edit${uploading ? ' is-uploading' : ''}`} aria-label="Đổi ảnh đại diện">
                {ring}
                <span className="profile-avatar-camera-badge" aria-hidden="true">
                  <CameraIcon size={14} />
                </span>
              </label>
            </>
          ) : (
            ring
          )}
          <div className="profile-hero-text">
            <h1>{user.displayName}</h1>
            <p className="muted">{user.email}</p>
            <div className="badges">
              <span className="badge">{user.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}</span>
              {user.emailVerifiedAt && (
                <span className="badge badge-success">
                  <ShieldCheckIcon size={14} /> Đã xác minh email
                </span>
              )}
              <span className="badge badge-muted">Tham gia {formatDate(user.createdAt, true)}</span>
            </div>
          </div>
          <div className="profile-completeness" title={checklist.map(([l, ok]) => `${ok ? '✓' : '○'} ${l}`).join('\n')}>
            <div className="completeness-head">
              <span>Hồ sơ hoàn thiện</span>
              <strong>{percent}%</strong>
            </div>
            <div className="completeness-bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${percent}%` }} />
            </div>
            <small>{done}/{checklist.length} mục đã xong</small>
          </div>
        </div>
        <nav className="account-tabs" aria-label="Tài khoản">
          {TABS.map(([to, label, Icon, end]) => (
            <NavLink key={to} to={to} end={end} className="account-tab">
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
      </section>

      <Outlet context={{ checklist }} />
    </div>
  );
}
