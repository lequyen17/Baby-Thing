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

export function Field({ label, error, ...inputProps }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...inputProps} aria-invalid={Boolean(error)} />
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

export function Alert({ type = 'error', children }) {
  if (!children) return null;
  return <div className={`alert alert-${type}`}>{children}</div>;
}
