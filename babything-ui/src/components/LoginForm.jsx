import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Alert, Field } from './Form';
import GoogleSignInButton from './GoogleSignInButton';

/**
 * Bước 1 của đăng nhập (email + mật khẩu, hoặc Google), dùng chung cho trang /login và popup.
 * onMfa(challenge): server yêu cầu OTP; onSignedIn(): đã có phiên.
 * onLeave: gọi khi bấm link sang trang khác (Quên mật khẩu) để popup tự đóng.
 */
export function LoginForm({ onMfa, onSignedIn, onLeave }) {
  const { signIn } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await api('/auth/login', { method: 'POST', body: form, auth: false });
      if (res.mfaRequired) {
        onMfa(res.challenge);
      } else {
        // Server tắt OTP đăng nhập (LOGIN_OTP_ENABLED=false) -> nhận token luôn
        await signIn(res.tokens);
        onSignedIn();
      }
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.fields || {});
      setSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} noValidate>
        <Alert>{error}</Alert>
        <Field
          label="Email" required
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={update('email')}
          error={fieldErrors.email}
        />
        <Field
          label="Mật khẩu" required
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={update('password')}
          error={fieldErrors.password}
        />
        <div className="row-end">
          <Link to="/forgot-password" onClick={onLeave}>
            Quên mật khẩu?
          </Link>
        </div>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Đang gửi mã…' : 'Tiếp tục'}
        </button>
      </form>
      <GoogleSignInButton text="signin_with" onSignedIn={onSignedIn} />
    </>
  );
}

/** Bước 2: nhập mã OTP đã gửi qua email cho challenge vừa nhận. */
export function useLoginVerify(challenge, onSignedIn) {
  const { signIn } = useAuth();
  const verify = async (otp) => {
    const tokens = await api('/auth/login/verify', {
      method: 'POST',
      body: { challengeId: challenge.challengeId, otp },
      auth: false,
    });
    await signIn(tokens);
    onSignedIn();
  };
  const resend = () =>
    api('/auth/login/resend', { method: 'POST', body: { challengeId: challenge.challengeId }, auth: false });
  return { verify, resend };
}
