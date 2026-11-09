import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LoginForm, useLoginVerify } from '../components/LoginForm';
import { OtpForm } from '../components/OtpForm';
import { RegisterForm, useRegisterVerify } from '../components/RegisterForm';
import { saveReturnTo } from '../pages/flowStorage';

const LoginModalContext = createContext(null);

/**
 * Popup đăng nhập / đăng ký ngay trên trang đang xem: khách không phải rời trang (mất vị trí cuộn, bộ lọc).
 * openLogin(after, mode): mở popup ('login' | 'register'); có phiên xong thì đóng popup rồi chạy after (vd. thêm vào giỏ).
 * Trang /login, /register vẫn giữ cho link trực tiếp, ProtectedRoute và các trang ngoài AppLayout.
 */
export function LoginModalProvider({ children }) {
  const [pending, setPending] = useState(null);
  const { pathname, search, key } = useLocation();

  const openLogin = useCallback((after, mode = 'login') => setPending({ after, mode }), []);
  const close = useCallback(() => setPending(null), []);

  // Chuyển trang (Back, link Quên mật khẩu) thì đóng popup
  useEffect(close, [key, close]);

  const handleSignedIn = useCallback(() => {
    const after = pending?.after;
    setPending(null);
    after?.();
  }, [pending]);

  return (
    <LoginModalContext.Provider value={openLogin}>
      {children}
      {pending && (
        <LoginDialog
          initialMode={pending.mode}
          onClose={close}
          onSignedIn={handleSignedIn}
          // Quên mật khẩu xong thì quay về đúng trang đang xem
          onLeave={() => saveReturnTo(pathname + search)}
        />
      )}
    </LoginModalContext.Provider>
  );
}

/** null khi nằm ngoài LoginModalProvider (trang không có header của sàn). */
export function useLoginModal() {
  return useContext(LoginModalContext);
}

/** step: 'login' | 'register' | { challenge } (OTP đăng nhập) | { email } (OTP đăng ký) */
function LoginDialog({ initialMode, onClose, onSignedIn, onLeave }) {
  const [step, setStep] = useState(initialMode);
  const [dialog, setDialog] = useState(null);

  // showModal ngay khi gắn vào DOM: trình duyệt lo Esc, khoá focus trong popup, lớp phủ nền
  const attach = useCallback((el) => {
    if (el && !el.open) el.showModal();
    setDialog(el);
  }, []);

  // Đổi bước thì cuộn lên đầu và focus ô nhập đầu tiên
  useEffect(() => {
    if (!dialog) return;
    dialog.scrollTop = 0;
    dialog.querySelector('input')?.focus();
  }, [dialog, step]);

  let content;
  if (step === 'login') {
    content = (
      <>
        <Heading title="Đăng nhập" subtitle="Đăng nhập để mua, nhắn tin và đăng bán." />
        <LoginForm onMfa={(challenge) => setStep({ challenge })} onSignedIn={onSignedIn} onLeave={onLeave} />
        <div className="card-footer">
          Chưa có tài khoản?{' '}
          <button type="button" className="link-button" onClick={() => setStep('register')}>
            Đăng ký
          </button>
        </div>
      </>
    );
  } else if (step === 'register') {
    content = (
      <>
        <Heading title="Đăng ký" subtitle="Tạo tài khoản miễn phí để mua và bán đồ cho bé." />
        <RegisterForm onCodeSent={(email) => setStep({ email })} onSignedIn={onSignedIn} />
        <div className="card-footer">
          Đã có tài khoản?{' '}
          <button type="button" className="link-button" onClick={() => setStep('login')}>
            Đăng nhập
          </button>
        </div>
      </>
    );
  } else if (step.challenge) {
    content = <LoginVerifyStep challenge={step.challenge} onSignedIn={onSignedIn} onBack={() => setStep('login')} />;
  } else {
    content = <RegisterVerifyStep email={step.email} onSignedIn={onSignedIn} onBack={() => setStep('register')} />;
  }

  return (
    <dialog
      ref={attach}
      className="login-dialog"
      aria-labelledby="login-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // Bấm ra lớp phủ bên ngoài khung thì đóng
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="login-dialog-body auth-card">
        <button type="button" className="login-dialog-close" onClick={onClose} aria-label="Đóng">
          ×
        </button>
        {content}
      </div>
    </dialog>
  );
}

function Heading({ title, subtitle }) {
  return (
    <>
      <h2 id="login-dialog-title" className="serif">
        {title}
      </h2>
      <p className="muted">{subtitle}</p>
    </>
  );
}

function LoginVerifyStep({ challenge, onSignedIn, onBack }) {
  const { verify, resend } = useLoginVerify(challenge, onSignedIn);
  return (
    <>
      <Heading title="Xác minh đăng nhập" subtitle={`Nhập mã 6 số đã gửi tới ${challenge.email}`} />
      <OtpForm onSubmit={verify} onResend={resend} />
      <div className="card-footer">
        <button type="button" className="link-button" onClick={onBack}>
          Quay lại đăng nhập
        </button>
      </div>
    </>
  );
}

function RegisterVerifyStep({ email, onSignedIn, onBack }) {
  const { verify, resend } = useRegisterVerify(email, onSignedIn);
  return (
    <>
      <Heading title="Xác minh email" subtitle={`Nhập mã 6 số đã gửi tới ${email}`} />
      <OtpForm onSubmit={verify} onResend={resend} />
      <div className="card-footer">
        <button type="button" className="link-button" onClick={onBack}>
          Dùng email khác
        </button>
      </div>
    </>
  );
}
