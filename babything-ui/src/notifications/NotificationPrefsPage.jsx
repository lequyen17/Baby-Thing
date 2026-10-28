import { useAuth } from '../auth/AuthContext';
import { LockIcon } from '../components/Icons';
import { GROUPS, useNotifications } from './useNotifications';

/** FR-NOTI-05: bật/tắt từng nhóm không bắt buộc; thông báo giao dịch và bảo mật luôn bật. */
export default function NotificationPrefsPage() {
  const { user } = useAuth();
  const { enabled, setPref } = useNotifications(user.id);

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Cài đặt thông báo</h2>
          <p className="muted">Thông báo giao dịch và bảo mật luôn được gửi qua web và email. SMS chỉ dùng để gửi mã OTP.</p>
        </div>
      </div>
      <ul className="pref-list">
        {GROUPS.map((g) => (
          <li key={g.id} className="pref-item">
            <div>
              <strong>{g.label}</strong>
              <p className="muted">{g.desc}</p>
              {g.email && <small className="muted">Gửi kèm email</small>}
            </div>
            {g.locked ? (
              <span className="badge badge-muted">
                <LockIcon size={12} /> Luôn bật
              </span>
            ) : (
              <label className="switch">
                <input type="checkbox" checked={enabled(g.id)} onChange={(e) => setPref(g.id, e.target.checked)} aria-label={`Nhận thông báo ${g.label}`} />
                <span className="switch-track" />
              </label>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
