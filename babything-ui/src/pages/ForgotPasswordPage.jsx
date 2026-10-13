import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Alert, AuthCard, Field } from '../components/Form';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await api('/auth/forgot-password', { method: 'POST', body: { email }, auth: false });
      setMessage(res.message);
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.fields || {});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Forgot password"
      subtitle="Enter your registered email and we'll send you a password reset link."
      footer={<Link to="/login">Back to sign in</Link>}
    >
      {message ? (
        <Alert type="success">{message}</Alert>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <Alert>{error}</Alert>
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
          />
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
