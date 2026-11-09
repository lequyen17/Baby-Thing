import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Alert, AuthCard, Field } from '../components/Form';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { savePendingRegisterEmail } from './flowStorage';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ displayName: '', email: '', password: '', confirmPassword: '' });
  const [agreed, setAgreed] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    if (form.password !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Mật khẩu nhập lại không khớp' });
      return;
    }
    if (!agreed) {
      setError('Vui lòng đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư để tạo tài khoản.');
      return;
    }
    setSubmitting(true);
    try {
      const { confirmPassword, ...body } = form;
      await api('/auth/register', { method: 'POST', body, auth: false });
      savePendingRegisterEmail(form.email.trim().toLowerCase());
      navigate('/register/verify');
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.fields || {});
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Đăng ký"
      footer={
        <>
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <Alert>{error}</Alert>
        <Field
          label="Tên hiển thị" required
          maxLength={50}
          value={form.displayName}
          onChange={update('displayName')}
          error={fieldErrors.displayName}
        />
        <Field
          label="Email" required
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={update('email')}
          error={fieldErrors.email}
        />
        <Field
          label="Mật khẩu (8–72 ký tự)" required
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={update('password')}
          error={fieldErrors.password}
        />
        <Field
          label="Nhập lại mật khẩu" required
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={update('confirmPassword')}
          error={fieldErrors.confirmPassword}
        />
        <label className="check consent">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            Tôi đồng ý với{' '}
            <Link to="/terms" target="_blank">
              Điều khoản sử dụng
            </Link>{' '}
            và{' '}
            <Link to="/privacy" target="_blank">
              Chính sách quyền riêng tư
            </Link>
            .
          </span>
        </label>
        <label className="check consent">
          <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
          <span>Tôi muốn nhận thông tin khuyến mãi và gợi ý sản phẩm (không bắt buộc).</span>
        </label>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Đang gửi mã…' : 'Đăng ký'}
        </button>
      </form>
      <GoogleSignInButton text="signup_with" />
    </AuthCard>
  );
}
