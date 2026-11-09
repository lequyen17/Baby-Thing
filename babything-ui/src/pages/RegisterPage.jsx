import { Link, useNavigate } from 'react-router-dom';
import { AuthCard } from '../components/Form';
import { RegisterForm } from '../components/RegisterForm';
import { savePendingRegisterEmail } from './flowStorage';

export default function RegisterPage() {
  const navigate = useNavigate();

  return (
    <AuthCard
      title="Đăng ký"
      footer={
        <>
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </>
      }
    >
      <RegisterForm
        onCodeSent={(email) => {
          savePendingRegisterEmail(email);
          navigate('/register/verify');
        }}
      />
    </AuthCard>
  );
}
