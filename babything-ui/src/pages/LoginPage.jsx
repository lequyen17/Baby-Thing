import { Link, useNavigate } from 'react-router-dom';
import { AuthCard } from '../components/Form';
import { LoginForm } from '../components/LoginForm';
import { saveLoginChallenge, takeReturnTo } from './flowStorage';

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <AuthCard
      title="Đăng nhập"
      footer={
        <>
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </>
      }
    >
      <LoginForm
        onMfa={(challenge) => {
          saveLoginChallenge(challenge);
          navigate('/login/verify');
        }}
        onSignedIn={() => navigate(takeReturnTo(), { replace: true })}
      />
    </AuthCard>
  );
}
