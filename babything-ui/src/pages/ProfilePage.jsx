import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api } from '../api/client';
import { useAddresses, useExtraProfile, usePayoutAccount } from '../account/useAccountData';
import { useAuth } from '../auth/AuthContext';
import { Alert, Field } from '../components/Form';
import { CalendarIcon, CheckIcon, ClockIcon, MailIcon, ShieldCheckIcon } from '../components/Icons';
import { HANOI_DISTRICTS } from '../data/vnLocations';
import { formatDate } from '../utils/format';

const BIO_MAX = 160;

function InfoRow({ icon, label, children }) {
  return (
    <div className="info-row">
      <span className="info-row-icon">{icon}</span>
      <div>
        <div className="info-row-label">{label}</div>
        <div className="info-row-value">{children}</div>
      </div>
    </div>
  );
}

/** FR-USER-06: tên hiển thị, khu vực (quận/huyện Hà Nội), giới thiệu ngắn. */
export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { checklist } = useOutletContext();
  const [extra, setExtra] = useExtraProfile(user.id);
  const [addresses] = useAddresses(user.id);
  const [payout] = usePayoutAccount(user.id);
  const [form, setForm] = useState({ displayName: user.displayName, district: extra.district, bio: extra.bio });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const dirty = form.displayName !== user.displayName || form.district !== extra.district || form.bio !== extra.bio;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setFieldErrors({});
    const name = form.displayName.trim();
    if (name.length < 2) {
      setFieldErrors({ displayName: 'Tên hiển thị cần ít nhất 2 ký tự.' });
      return;
    }
    setSaving(true);
    try {
      if (name !== user.displayName) {
        setUser(await api('/users/me', { method: 'PATCH', body: { displayName: name } }));
      }
      setExtra({ district: form.district, bio: form.bio.trim() });
      setForm({ ...form, displayName: name, bio: form.bio.trim() });
      setMessage('Đã lưu thay đổi.');
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.fields || {});
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="account-grid">
      <section className="card">
        <h2 className="card-title">Thông tin cá nhân</h2>
        <form onSubmit={handleSubmit} noValidate className="profile-form">
          <Alert>{error}</Alert>
          <Alert type="success">{message}</Alert>
          <Field label="Tên hiển thị" value={form.displayName} onChange={update('displayName')} error={fieldErrors.displayName} maxLength={50} />
          <Field label="Email" value={user.email} disabled readOnly />
          <Field label="Khu vực (quận/huyện Hà Nội)" as="select" value={form.district} onChange={update('district')}>
            <option value="">Chọn quận/huyện</option>
            {HANOI_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Field>
          <label className="field">
            <span>
              Giới thiệu ngắn{' '}
              <em className="field-counter">
                {form.bio.length}/{BIO_MAX}
              </em>
            </span>
            <textarea
              rows={3}
              maxLength={BIO_MAX}
              value={form.bio}
              onChange={update('bio')}
              placeholder="Ví dụ: Mẹ bỉm 2 bé, đồ giặt kỹ và phơi nắng, ship nhanh trong nội thành."
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving || !dirty}>
              {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
            {dirty && !saving && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setForm({ displayName: user.displayName, district: extra.district, bio: extra.bio })}
              >
                Hoàn tác
              </button>
            )}
          </div>
        </form>
      </section>

      <aside className="account-side">
        <section className="card">
          <h2 className="card-title">Hoàn thiện hồ sơ</h2>
          <ul className="checklist">
            {checklist.map(([label, ok]) => (
              <li key={label} className={ok ? 'is-done' : undefined}>
                <span className="checklist-dot">{ok && <CheckIcon size={12} />}</span>
                {label}
              </li>
            ))}
          </ul>
          {(addresses.length === 0 || !payout) && (
            <p className="muted card-note">
              {addresses.length === 0 && <Link to="/profile/addresses">Thêm địa chỉ</Link>}
              {addresses.length === 0 && !payout && ' · '}
              {!payout && <Link to="/profile/payout">Thêm tài khoản nhận tiền</Link>}
            </p>
          )}
        </section>

        <section className="card">
          <h2 className="card-title">Hoạt động tài khoản</h2>
          <InfoRow icon={<CalendarIcon />} label="Ngày tham gia">
            {formatDate(user.createdAt, true)}
          </InfoRow>
          <InfoRow icon={<ShieldCheckIcon />} label="Xác minh email">
            {formatDate(user.emailVerifiedAt)}
          </InfoRow>
          <InfoRow icon={<ClockIcon />} label="Đăng nhập gần nhất">
            {formatDate(user.lastLoginAt)}
          </InfoRow>
          <InfoRow icon={<MailIcon />} label="Trang người bán công khai">
            <Link to={`/sellers/${user.id}`}>Xem hồ sơ của tôi</Link>
          </InfoRow>
        </section>
      </aside>
    </div>
  );
}
