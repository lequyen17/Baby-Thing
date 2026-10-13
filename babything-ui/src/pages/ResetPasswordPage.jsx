import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Alert, AuthCard, Field } from '../components/Form';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    if (form.newPassword !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await api('/auth/reset-password', {
        method: 'POST',
        body: { token, newPassword: form.newPassword },
        auth: false,
      });
      setMessage(res.message);
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.fields || {});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard title="Reset password" footer={<Link to="/login">Sign in</Link>}>
      {!token && <Alert>Invalid reset link.</Alert>}
      {message && <Alert type="success">{message}</Alert>}
      {token && !message && (
        <form onSubmit={handleSubmit} noValidate>
          <Alert>{error}</Alert>
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
            {submitting ? 'Saving...' : 'Reset password'}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
