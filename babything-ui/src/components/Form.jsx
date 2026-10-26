export function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="page-center">
      <div className="card auth-card">
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
        {children}
        {footer && <div className="card-footer">{footer}</div>}
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
