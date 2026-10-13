import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AuthCard } from '../components/Form';
import { OtpForm } from '../components/OtpForm';
import { clearLoginChallenge, loadLoginChallenge } from './flowStorage';

export default function LoginVerifyPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const challenge = loadLoginChallenge();

  if (!challenge) return <Navigate to="/login" replace />;

  const verify = async (otp) => {
    const tokens = await api('/auth/login/verify', {
      method: 'POST',
      body: { challengeId: challenge.challengeId, otp },
      auth: false,
    });
    clearLoginChallenge();
    await signIn(tokens);
    navigate('/profile', { replace: true });
  };

  const resend = () =>
    api('/auth/login/resend', { method: 'POST', body: { challengeId: challenge.challengeId }, auth: false });

  return (
    <AuthCard
      title="Verify sign-in"
      subtitle={`Enter the 6-digit code sent to ${challenge.email}`}
      footer={<Link to="/login">Back to sign in</Link>}
    >
      <OtpForm onSubmit={verify} onResend={resend} />
    </AuthCard>
  );
}
