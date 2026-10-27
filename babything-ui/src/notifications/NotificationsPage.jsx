import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { BellIcon, CheckIcon, XIcon } from '../components/Icons';
import { timeAgo } from '../utils/format';
import { groupOf, useNotifications } from './useNotifications';

const FILTERS = [
  ['all', 'Tất cả'],
  ['unread', 'Chưa đọc'],
];

/** FR-NOTI-01: danh sách thông báo, đánh dấu đã đọc, bấm đi tới trang liên quan. */
export default function NotificationsPage() {
  const { user } = useAuth();
  const { items, unread, markRead, markAllRead, remove } = useNotifications(user.id);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const shown = filter === 'unread' ? items.filter((n) => !n.read) : items;

  return (
    <div className="page narrow">
      <div className="page-header-row">
        <div>
          <h1>Thông báo</h1>
          <p className="muted">{unread > 0 ? `Bạn có ${unread} thông báo chưa đọc.` : 'Bạn đã đọc hết thông báo.'}</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={markAllRead} disabled={unread === 0}>
            <CheckIcon size={16} /> Đánh dấu tất cả đã đọc
          </button>
          <Link to="/profile/notifications" className="btn btn-secondary btn-sm">
            Cài đặt
          </Link>
        </div>
      </div>

      <div className="segmented" role="tablist">
        {FILTERS.map(([value, label]) => (
          <button key={value} type="button" role="tab" aria-selected={filter === value} className={filter === value ? 'is-active' : undefined} onClick={() => setFilter(value)}>
            {label}
            {value === 'unread' && unread > 0 && <span className="count-pill">{unread}</span>}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card empty-block">
          <span className="empty-icon">
            <BellIcon size={28} />
          </span>
          <strong>{filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo'}</strong>
          <p className="muted">Cập nhật về đơn hàng, tin nhắn và tin đăng của bạn sẽ hiện ở đây.</p>
        </div>
      ) : (
        <ul className="card noti-list">
          {shown.map((n) => (
            <li key={n.id} className={`noti-item${n.read ? '' : ' is-unread'}`}>
              <button
                type="button"
                className="noti-main"
                onClick={() => {
                  markRead(n.id);
                  navigate(n.to);
                }}
              >
                <span className={`noti-icon group-${n.group}`}>
                  <BellIcon size={18} />
                </span>
                <span className="noti-text">
                  <strong>{n.title}</strong>
                  <span>{n.body}</span>
                  <small>
                    {groupOf(n.group)?.label} · {timeAgo(n.at)}
                  </small>
                </span>
                {!n.read && <span className="unread-dot" aria-label="Chưa đọc" />}
              </button>
              <button type="button" className="icon-btn" aria-label="Xoá thông báo" onClick={() => remove(n.id)}>
                <XIcon size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
