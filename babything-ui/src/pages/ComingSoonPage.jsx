import { Link } from 'react-router-dom';

/** Các mục có trong thiết kế nhưng backend chưa hỗ trợ: hiển thị trang "sắp ra mắt". */
export const COMING_SOON = {
  'image-search': ['Tìm bằng hình ảnh', 'Chụp ảnh món đồ, AI tìm những tin đăng tương tự cho bạn.'],
  feedback: ['Góp ý', 'Gửi góp ý và theo dõi phản hồi của Baby Things ngay trong tài khoản.'],
};

export default function ComingSoonPage({ feature }) {
  const [title, text] = COMING_SOON[feature];
  return (
    <div className="coming-soon">
      <span className="pill pill-sage">Sắp ra mắt</span>
      <h1>{title}</h1>
      <p className="muted">{text}</p>
      <p className="muted">Tính năng này đang được phát triển và sẽ sớm có mặt.</p>
      <Link to="/" className="btn btn-dark btn-lg">
        Về trang chủ
      </Link>
    </div>
  );
}
