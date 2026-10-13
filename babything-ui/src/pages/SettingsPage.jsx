import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Alert, Field } from '../components/Form';
import { LockIcon } from '../components/Icons';

const EMPTY_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' };

function ChangePasswordForm() {
  const { signIn } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setFieldErrors({});
    if (form.newPassword !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }
    setSubmitting(true);
    try {
      const tokens = await api('/auth/change-password', {
        method: 'POST',
        body: { currentPassword: form.currentPassword, newPassword: form.newPassword },
      });
      // Server đã thu hồi mọi phiên khác, cấp phiên mới cho thiết bị này
      await signIn(tokens);
      setForm(EMPTY_FORM);
      setMessage('Password changed. You have been signed out on all other devices.');
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.fields || {});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="settings-form" onSubmit={handleSubmit} noValidate>
      <Alert>{error}</Alert>
      <Alert type="success">{message}</Alert>
      <Field
        label="Current password"
        type="password"
        autoComplete="current-password"
        value={form.currentPassword}
        onChange={update('currentPassword')}
        error={fieldErrors.currentPassword}
      />
      <Field
        label="New password (8-72 characters)"
        type="password"
        autoComplete="new-password"
        value={form.newPassword}
        onChange={update('newPassword')}
        error={fieldErrors.newPassword}
      />
      <Field
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        value={form.confirmPassword}
        onChange={update('confirmPassword')}
        error={fieldErrors.confirmPassword}
      />
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Saving...' : 'Update password'}
      </button>
    </form>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
        <p className="muted">Manage your account security.</p>
      </div>

      <div className="settings-layout">
        <nav className="settings-nav">
          <span className="settings-nav-item active">
            <LockIcon /> Password
          </span>
        </nav>

        <section className="card">
          <h2 className="card-title">Change password</h2>
          {user.hasPassword ? (
            <>
              <p className="muted card-description">
                After changing your password, you will be signed out on all other devices.
              </p>
              <ChangePasswordForm />
            </>
          ) : (
            // Tài khoản tạo bằng Google chưa có mật khẩu -> đặt qua luồng quên mật khẩu (link gửi về email)
            <p className="muted card-description">
              Your account signs in with Google and has no password yet. To also sign in with email and
              password, <Link to="/forgot-password">set a password</Link> via a link sent to your email.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
