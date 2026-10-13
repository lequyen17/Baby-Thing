import { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUpload } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { Alert } from '../components/Form';
import {
  BadgeIcon,
  CalendarIcon,
  CameraIcon,
  ClockIcon,
  MailIcon,
  ShieldCheckIcon,
  UserIcon,
} from '../components/Icons';
import { formatDate } from '../utils/format';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

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

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef(null);
  const avatarInputId = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError('');
    setMessage('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const me = await apiUpload('/users/me/avatar', form);
      setUser(me);
      setMessage('Profile photo updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const avatarRing = (
    <div className="profile-avatar-ring">
      <Avatar user={user} size={96} />
    </div>
  );

  return (
    <div className="page">
      <section className="card profile-hero">
        <div className="profile-cover" />
        <div className="profile-hero-body">
          {user.avatarUploadEnabled ? (
            <>
              <input
                ref={fileInputRef}
                id={avatarInputId}
                type="file"
                accept={ACCEPT}
                className="visually-hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <label
                htmlFor={avatarInputId}
                className={`profile-avatar-edit${uploading ? ' is-uploading' : ''}`}
                aria-label="Change profile photo"
              >
                {avatarRing}
                <span className="profile-avatar-camera-badge" aria-hidden="true">
                  <CameraIcon size={14} />
                </span>
              </label>
            </>
          ) : (
            avatarRing
          )}
          <div className="profile-hero-text">
            <h1>{user.displayName}</h1>
            <p className="muted">{user.email}</p>
            <div className="badges">
              <span className="badge">{user.role === 'ADMIN' ? 'Admin' : 'Member'}</span>
              {user.emailVerifiedAt && (
                <span className="badge badge-success">
                  <ShieldCheckIcon size={14} /> Email verified
                </span>
              )}
            </div>
            {(error || message) && (
              <div className="profile-avatar-alerts">
                <Alert>{error}</Alert>
                <Alert type="success">{message}</Alert>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="profile-grid">
        <section className="card">
          <h2 className="card-title">Personal information</h2>
          <InfoRow icon={<UserIcon />} label="Display name">
            {user.displayName}
          </InfoRow>
          <InfoRow icon={<MailIcon />} label="Email">
            {user.email}
          </InfoRow>
          <InfoRow icon={<BadgeIcon />} label="Role">
            {user.role === 'ADMIN' ? 'Administrator' : 'Member'}
          </InfoRow>
        </section>

        <section className="card">
          <h2 className="card-title">Account activity</h2>
          <InfoRow icon={<CalendarIcon />} label="Member since">
            {formatDate(user.createdAt)}
          </InfoRow>
          <InfoRow icon={<ShieldCheckIcon />} label="Email verified">
            {formatDate(user.emailVerifiedAt)}
          </InfoRow>
          <InfoRow icon={<ClockIcon />} label="Last sign-in">
            {formatDate(user.lastLoginAt)}
          </InfoRow>
        </section>
      </div>

      <p className="muted page-hint">
        Want to change your password? Go to <Link to="/settings">Settings</Link>.
      </p>
    </div>
  );
}
