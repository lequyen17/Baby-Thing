import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  BellIcon,
  CameraIcon,
  CardIcon,
  LockIcon,
  MessageIcon,
  OrderIcon,
  PenIcon,
} from '../components/Icons';

/** Các mục có trong thiết kế nhưng backend chưa hỗ trợ: hiển thị trang "sắp ra mắt". */
export const COMING_SOON = {
  messages: [MessageIcon, 'tone-butter', 'Tin nhắn', 'Hỏi tình trạng, thương lượng giá trực tiếp với người bán.'],
  notifications: [BellIcon, 'tone-peach', 'Thông báo', 'Cập nhật về đơn hàng, tin nhắn và tin đăng bạn quan tâm.'],
  orders: [OrderIcon, 'tone-sage', 'Đơn mua & đơn bán', 'Đặt hàng, xác nhận đơn và theo dõi trạng thái giao hàng.'],
  payments: [CardIcon, 'tone-sky', 'Thanh toán', 'Thanh toán an toàn và xem lại toàn bộ lịch sử giao dịch.'],
  'image-search': [CameraIcon, 'tone-sage', 'Tìm bằng hình ảnh', 'Chụp ảnh món đồ, AI tìm những tin đăng tương tự cho bạn.'],
  feedback: [PenIcon, 'tone-peach', 'Góp ý', 'Gửi góp ý và theo dõi phản hồi của Baby Things ngay trong tài khoản.'],
  terms: [LockIcon, 'tone-sky', 'Điều khoản sử dụng', 'Các quy định khi mua bán trên Baby Things.'],
  privacy: [LockIcon, 'tone-sage', 'Chính sách bảo mật', 'Cách Baby Things thu thập và bảo vệ dữ liệu của bạn.'],
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
