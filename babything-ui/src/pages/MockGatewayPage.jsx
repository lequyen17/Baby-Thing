import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Alert } from '../components/Form';
import { LockIcon } from '../components/Icons';
import { PAYMENT_METHODS, PaymentStatusBadge } from '../components/PaymentStatus';
import { formatDate, formatPrice } from '../utils/format';

/**
 * Cổng thanh toán giả lập (MockPaymentGateway): đóng vai trang của đối tác. Kết quả bấm ở đây đi qua cùng đường
 * xử lý với callback của cổng thật, rồi quay về trang đơn hàng.
 */
export default function MockGatewayPage() {
  const { ref } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/payments/mock-gateway/${ref}`)
      .then(setPayment)
      .catch((err) => setError(err.message));
  }, [ref]);

  const finish = async (success) => {
    setBusy(true);
    setError('');
    try {
      const result = await api(`/payments/mock-gateway/${ref}`, { method: 'POST', body: { success } });
      const notice =
        result.status === 'PAID'
          ? 'Thanh toán thành công. Người bán sẽ xác nhận đơn trong 24 giờ.'
          : `Thanh toán không thành công: ${result.failureReason ?? 'đã huỷ'}. Bạn có thể thanh toán lại.`;
      navigate(`/orders/${result.order.id}`, { replace: true, state: { notice, noticeType: result.status === 'PAID' ? 'success' : 'error' } });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="gateway-shell">
      <div className="gateway-card">
        <div className="gateway-brand">
          <LockIcon size={18} /> Cổng thanh toán <span className="pill pill-sage">Giả lập</span>
        </div>
        <Alert>{error}</Alert>
        {!payment && !error && <p className="muted">Đang tải…</p>}
        {payment && (
          <>
            <dl className="gateway-info">
              <dt>Đơn vị nhận</dt>
              <dd>Baby Things</dd>
              <dt>Nội dung</dt>
              <dd>Thanh toán đơn #{payment.order.id}</dd>
              <dt>Mã giao dịch</dt>
              <dd>{payment.transactionRef}</dd>
              <dt>Hình thức</dt>
              <dd>{PAYMENT_METHODS[payment.method] ?? payment.method}</dd>
              <dt>Hết hạn</dt>
              <dd>{formatDate(payment.expiresAt)}</dd>
            </dl>
            <div className="gateway-amount">{formatPrice(payment.amount)}</div>

            {payment.status === 'PENDING' ? (
              <>
                <p className="muted small-note">
                  Môi trường thử nghiệm: không có tiền thật được trừ. Chọn kết quả để mô phỏng phản hồi của ngân hàng / ví.
                </p>
                <div className="gateway-actions">
                  <button type="button" className="btn btn-primary btn-block" onClick={() => finish(true)} disabled={busy}>
                    Xác nhận thanh toán thành công
                  </button>
                  <button type="button" className="btn btn-secondary btn-block" onClick={() => finish(false)} disabled={busy}>
                    Huỷ / thanh toán thất bại
                  </button>
                </div>
              </>
            ) : (
              <div className="gateway-done">
                <PaymentStatusBadge status={payment.status} />
                {payment.failureReason && <p className="muted">{payment.failureReason}</p>}
                <Link to={`/orders/${payment.order.id}`} className="btn btn-secondary btn-block">
                  Về đơn hàng
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
