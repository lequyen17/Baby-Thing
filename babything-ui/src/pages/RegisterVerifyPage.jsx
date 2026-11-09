import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthCard } from '../components/Form';
import { OtpForm } from '../components/OtpForm';
import { useRegisterVerify } from '../components/RegisterForm';
import { clearPendingRegisterEmail, loadPendingRegisterEmail, takeReturnTo } from './flowStorage';

export default function RegisterVerifyPage() {
  const navigate = useNavigate();
  const email = loadPendingRegisterEmail();
  const { verify, resend } = useRegisterVerify(email, () => {
    clearPendingRegisterEmail();
    navigate(takeReturnTo(), { replace: true });
  });

  if (!email) return <Navigate to="/register" replace />;

  return (
    <AuthCard
      title="Xác minh email"
      subtitle={`Nhập mã 6 số đã gửi tới ${email}`}
      footer={<Link to="/register">Dùng email khác</Link>}
    >
      <OtpForm onSubmit={verify} onResend={resend} />
    </AuthCard>
  );
}
