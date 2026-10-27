import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Alert, Field } from '../components/Form';

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
      setFieldErrors({ confirmPassword: 'Mật khẩu nhập lại không khớp' });
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
      setMessage('Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.');
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
        label="Mật khẩu hiện tại"
        type="password"
        autoComplete="current-password"
        value={form.currentPassword}
        onChange={update('currentPassword')}
        error={fieldErrors.currentPassword}
      />
      <Field
        label="Mật khẩu mới (8–72 ký tự)"
        type="password"
        autoComplete="new-password"
        value={form.newPassword}
        onChange={update('newPassword')}
        error={fieldErrors.newPassword}
      />
      <Field
        label="Nhập lại mật khẩu mới"
        type="password"
        autoComplete="new-password"
        value={form.confirmPassword}
        onChange={update('confirmPassword')}
        error={fieldErrors.confirmPassword}
      />
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Đang lưu…' : 'Cập nhật mật khẩu'}
      </button>
    </form>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Đổi mật khẩu</h2>
        </div>
      </div>
          {user.hasPassword ? (
            <>
              <p className="muted card-description">
                Sau khi đổi mật khẩu, bạn sẽ bị đăng xuất khỏi các thiết bị khác.
              </p>
              <ChangePasswordForm />
            </>
          ) : (
            // Tài khoản tạo bằng Google chưa có mật khẩu -> đặt qua luồng quên mật khẩu (link gửi về email)
            <p className="muted card-description">
              Tài khoản của bạn đăng nhập bằng Google và chưa có mật khẩu. Để đăng nhập thêm bằng email và mật khẩu, hãy <Link to="/forgot-password">đặt mật khẩu</Link> qua liên kết gửi về email.
            </p>
          )}
    </section>
  );
}
