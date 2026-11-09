import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useLoginModal } from '../auth/LoginModal';

const SellModalContext = createContext(null);

/**
 * Popup "Đăng bán": chọn ký gửi BabyThings Care hay tự đăng tin.
 * Khách chưa đăng nhập thì mở popup đăng nhập trước, xong mới hiện popup chọn.
 * Phải nằm trong LoginModalProvider.
 */
export function SellModalProvider({ children }) {
  const { user } = useAuth();
  const openLogin = useLoginModal();
  const [open, setOpen] = useState(false);
  const { key } = useLocation();

  const close = useCallback(() => setOpen(false), []);
  useEffect(close, [key, close]);

  const openSell = useCallback(() => {
    if (user) setOpen(true);
    else openLogin(() => setOpen(true));
  }, [user, openLogin]);

  return (
    <SellModalContext.Provider value={openSell}>
      {children}
      {open && <SellDialog onClose={close} />}
    </SellModalContext.Provider>
  );
}

export function useSellModal() {
  return useContext(SellModalContext);
}

/** Nút/đường dẫn "Đăng bán" mở popup chọn cách bán; giữ href /sell cho mở tab mới. */
export function SellLink({ children, ...props }) {
  const openSell = useSellModal();
  return (
    <a
      href="/sell"
      {...props}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey || e.shiftKey) return;
        e.preventDefault();
        openSell();
      }}
    >
      {children}
    </a>
  );
}

function SellDialog({ onClose }) {
  const navigate = useNavigate();
  const attach = useCallback((el) => {
    if (el && !el.open) el.showModal();
  }, []);

  return (
    <dialog
      ref={attach}
      className="login-dialog sell-dialog"
      aria-labelledby="sell-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="login-dialog-body">
        <button type="button" className="login-dialog-close" onClick={onClose} aria-label="Đóng">
          ×
        </button>
        <h2 id="sell-dialog-title" className="serif">
          Đăng bán
        </h2>
        <p className="muted">Bạn muốn bán đồ theo cách nào?</p>

        <div className="sell-options">
          <button type="button" className="sell-option sell-option-care" onClick={() => navigate('/care/new')}>
            <strong>Ký gửi BabyThings Care</strong>
            <span>Chúng mình kiểm tra, làm sạch, chụp ảnh và bán hộ với nhãn Renewed.</span>
            <small>1–5 món/lô · hoa hồng 10% khi bán được · ký gửi 60 ngày</small>
          </button>
          <button type="button" className="sell-option" onClick={() => navigate('/products/new')}>
            <strong>Tự đăng bán</strong>
            <span>Tự đăng tin, trợ lý AI soạn sẵn mô tả và gợi ý giá. Bạn tự giao dịch với người mua.</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
