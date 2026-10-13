import { useEffect, useState } from 'react';
import { Alert, Field } from './Form';

const RESEND_SECONDS = 60;

/** Form nhập OTP 6 số kèm nút gửi lại mã có đếm ngược. */
export function OtpForm({ onSubmit, onResend }) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      await onSubmit(otp);
    } catch (err) {
      setError(err.fields?.otp || err.message);
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    try {
      await onResend();
      setInfo('A new verification code has been sent');
      setOtp('');
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Alert>{error}</Alert>
      <Alert type="success">{info}</Alert>
      <Field
        label="Verification code"
        className="otp-input"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
      />
      <button type="submit" className="btn btn-primary" disabled={submitting || otp.length !== 6}>
        {submitting ? 'Verifying...' : 'Verify'}
      </button>
      <button type="button" className="btn btn-link" onClick={handleResend} disabled={cooldown > 0}>
        {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
      </button>
    </form>
  );
}
