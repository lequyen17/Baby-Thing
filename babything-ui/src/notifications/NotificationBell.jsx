import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { BellIcon } from '../components/Icons';
import { timeAgo } from '../utils/format';
import { groupOf, useNotifications } from './useNotifications';

/** Chuông trên header: số chưa đọc, 5 thông báo gần nhất, bấm để đi tới trang liên quan (FR-NOTI-01). */
export default function NotificationBell() {
  const { user } = useAuth();
  const { items, unread, markRead, markAllRead } = useNotifications(user.id);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const go = (n) => {
    markRead(n.id);
    navigate(n.to);
  };

  return (
    <div className="bell" ref={ref}>
      <button
        type="button"
        className="app-nav-link bell-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unread ? `Thông báo, ${unread} chưa đọc` : 'Thông báo'}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="nav-icon">
          <BellIcon size={24} />
          {unread > 0 && <span className="nav-badge">{unread > 9 ? '9+' : unread}</span>}
        </span>
        <span>Thông báo</span>
      </button>

      {open && (
        <div className="bell-panel">
          <div className="bell-head">
            <strong>Thông báo</strong>
            <button type="button" className="link-btn" onClick={markAllRead} disabled={unread === 0}>
              Đánh dấu đã đọc
            </button>
          </div>
          {items.length === 0 ? (
            <p className="muted bell-empty">Bạn chưa có thông báo nào.</p>
          ) : (
            <ul className="bell-list">
              {items.slice(0, 5).map((n) => (
                <li key={n.id}>
                  <button type="button" className={`bell-item${n.read ? '' : ' is-unread'}`} onClick={() => go(n)}>
                    <span className="bell-dot" aria-hidden="true" />
                    <span className="bell-text">
                      <strong>{n.title}</strong>
                      <span>{n.body}</span>
                      <small>
                        {groupOf(n.group)?.label} · {timeAgo(n.at)}
                      </small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link to="/notifications" className="bell-foot">
            Xem tất cả thông báo
          </Link>
        </div>
      )}
    </div>
  );
}
