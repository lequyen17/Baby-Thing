import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Alert, AuthCard, Field } from '../components/Form';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { saveLoginChallenge } from './flowStorage';

export default function LoginPage() {
  const navigate = useNavigate();
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
        saveLoginChallenge(res.challenge);
        navigate('/login/verify');
      } else {
        // Server tắt OTP đăng nhập (LOGIN_OTP_ENABLED=false) -> nhận token luôn
        await signIn(res.tokens);
        navigate('/profile', { replace: true });
      }
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.fields || {});
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Sign in"
      footer={
        <>
          Don't have an account? <Link to="/register">Sign up</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <Alert>{error}</Alert>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={update('email')}
          error={fieldErrors.email}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={update('password')}
          error={fieldErrors.password}
        />
        <div className="row-end">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Sending code...' : 'Continue'}
        </button>
      </form>
      <GoogleSignInButton text="signin_with" />
    </AuthCard>
  );
}
