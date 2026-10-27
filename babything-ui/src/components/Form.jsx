import { Link } from 'react-router-dom';
import { ShieldCheckIcon } from './Icons';

/** Trang xác thực chia đôi: bên trái giới thiệu thương hiệu, bên phải là form. */
export function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="auth-split">
      <aside className="auth-aside">
        <Link to="/" className="serif auth-aside-brand">
          Baby Things
        </Link>
        <div className="auth-aside-copy">
          <h2 className="serif">
            Đồ tốt cho bé,
            <br />
            trao tay lần hai.
          </h2>
          <p>Đăng nhập để mua, bán và theo dõi những sản phẩm bạn quan tâm.</p>
        </div>
        <div className="auth-aside-note">
          <ShieldCheckIcon size={20} /> Thông tin tài khoản được bảo mật
        </div>
      </aside>
      <div className="auth-main">
        <div className="auth-card">
          <h1 className="serif">{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
          {children}
          {footer && <div className="card-footer">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

/** as="textarea" | "select" để dùng thay cho input; children là các option của select. */
export function Field({ label, error, as: Control = 'input', children, ...inputProps }) {
  return (
    <label className="field">
      <span>{label}</span>
      <Control {...inputProps} aria-invalid={Boolean(error)}>
        {children}
      </Control>
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

export function Alert({ type = 'error', children }) {
  if (!children) return null;
  return <div className={`alert alert-${type}`}>{children}</div>;
}
