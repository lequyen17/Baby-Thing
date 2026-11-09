import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LoginForm, useLoginVerify } from '../components/LoginForm';
import { OtpForm } from '../components/OtpForm';
import { saveReturnTo } from '../pages/flowStorage';

const LoginModalContext = createContext(null);

/**
 * Popup đăng nhập ngay trên trang đang xem: khách không phải rời trang (mất vị trí cuộn, bộ lọc).
 * openLogin(after): mở popup; đăng nhập xong thì đóng popup rồi chạy after (vd. thêm vào giỏ).
 * Trang /login vẫn giữ cho link trực tiếp, ProtectedRoute và các trang ngoài AppLayout.
 */
export function LoginModalProvider({ children }) {
  const [pending, setPending] = useState(null);
  const { pathname, search, key } = useLocation();

  const openLogin = useCallback((after) => setPending({ after }), []);
  const close = useCallback(() => setPending(null), []);

  // Chuyển trang (Back, link Quên mật khẩu / Đăng ký) thì đóng popup
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
          onClose={close}
          onSignedIn={handleSignedIn}
          // Đăng ký / quên mật khẩu xong thì quay về đúng trang đang xem
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

function LoginDialog({ onClose, onSignedIn, onLeave }) {
  const [challenge, setChallenge] = useState(null);

  // showModal ngay khi gắn vào DOM: trình duyệt lo Esc, khoá focus trong popup, lớp phủ nền
  const attach = useCallback((el) => {
    if (el && !el.open) {
      el.showModal();
      el.querySelector('input')?.focus();
    }
  }, []);

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
        {challenge ? (
          <VerifyStep challenge={challenge} onSignedIn={onSignedIn} onBack={() => setChallenge(null)} />
        ) : (
          <>
            <h2 id="login-dialog-title" className="serif">
              Đăng nhập
            </h2>
            <p className="muted">Đăng nhập để mua, nhắn tin và đăng bán.</p>
            <LoginForm onMfa={setChallenge} onSignedIn={onSignedIn} onLeave={onLeave} />
            <div className="card-footer">
              Chưa có tài khoản?{' '}
              <Link to="/register" onClick={onLeave}>
                Đăng ký
              </Link>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

function VerifyStep({ challenge, onSignedIn, onBack }) {
  const { verify, resend } = useLoginVerify(challenge, onSignedIn);
  return (
    <>
      <h2 id="login-dialog-title" className="serif">
        Xác minh đăng nhập
      </h2>
      <p className="muted">Nhập mã 6 số đã gửi tới {challenge.email}</p>
      <OtpForm onSubmit={verify} onResend={resend} />
      <div className="card-footer">
        <button type="button" className="btn btn-link" onClick={onBack}>
          Quay lại đăng nhập
        </button>
      </div>
    </>
  );
}
