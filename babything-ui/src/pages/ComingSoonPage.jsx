import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  CameraIcon,
  CardIcon,
  PenIcon,
} from '../components/Icons';

/** Các mục có trong thiết kế nhưng backend chưa hỗ trợ: hiển thị trang "sắp ra mắt". */
export const COMING_SOON = {
  payments: [CardIcon, 'tone-sky', 'Thanh toán', 'Thanh toán an toàn và xem lại toàn bộ lịch sử giao dịch.'],
  'image-search': [CameraIcon, 'tone-sage', 'Tìm bằng hình ảnh', 'Chụp ảnh món đồ, AI tìm những tin đăng tương tự cho bạn.'],
  feedback: [PenIcon, 'tone-peach', 'Góp ý', 'Gửi góp ý và theo dõi phản hồi của Baby Things ngay trong tài khoản.'],
};

export default function ComingSoonPage({ feature }) {
  const [Icon, tone, title, text] = COMING_SOON[feature];
  return (
    <div className="coming-soon">
      <span className={`coming-soon-icon ${tone}`}>
        <Icon size={36} />
      </span>
      <span className="pill pill-sage">Sắp ra mắt</span>
      <h1>{title}</h1>
      <p className="muted">{text}</p>
      <p className="muted">Tính năng này đang được phát triển và sẽ sớm có mặt.</p>
      <Link to="/" className="btn btn-dark btn-lg">
        Về trang chủ <ArrowRightIcon />
      </Link>
    </div>
  );
}
