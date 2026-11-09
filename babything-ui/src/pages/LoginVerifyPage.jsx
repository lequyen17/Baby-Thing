import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthCard } from '../components/Form';
import { useLoginVerify } from '../components/LoginForm';
import { OtpForm } from '../components/OtpForm';
import { clearLoginChallenge, loadLoginChallenge, takeReturnTo } from './flowStorage';

export default function LoginVerifyPage() {
  const navigate = useNavigate();
  const challenge = loadLoginChallenge();
  const { verify, resend } = useLoginVerify(challenge, () => {
    clearLoginChallenge();
    navigate(takeReturnTo(), { replace: true });
  });

  if (!challenge) return <Navigate to="/login" replace />;

  return (
    <AuthCard
      title="Xác minh đăng nhập"
      subtitle={`Nhập mã 6 số đã gửi tới ${challenge.email}`}
      footer={<Link to="/login">Quay lại đăng nhập</Link>}
    >
      <OtpForm onSubmit={verify} onResend={resend} />
    </AuthCard>
  );
}
