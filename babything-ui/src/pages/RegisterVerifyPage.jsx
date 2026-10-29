import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AuthCard } from '../components/Form';
import { OtpForm } from '../components/OtpForm';
import { clearPendingRegisterEmail, loadPendingRegisterEmail, takeReturnTo } from './flowStorage';

export default function RegisterVerifyPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const email = loadPendingRegisterEmail();

  if (!email) return <Navigate to="/register" replace />;

  const verify = async (otp) => {
    const tokens = await api('/auth/register/verify', { method: 'POST', body: { email, otp }, auth: false });
    clearPendingRegisterEmail();
    await signIn(tokens);
    navigate(takeReturnTo(), { replace: true });
  };

  const resend = () => api('/auth/register/resend', { method: 'POST', body: { email }, auth: false });

  return (
    <AuthCard
      title="Verify your email"
      subtitle={`Enter the 6-digit code sent to ${email}`}
      footer={<Link to="/register">Use a different email</Link>}
    >
      <OtpForm onSubmit={verify} onResend={resend} />
    </AuthCard>
  );
}
