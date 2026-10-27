import { useState } from 'react';
import { maskAccount, usePayoutAccount } from '../account/useAccountData';
import { useAuth } from '../auth/AuthContext';
import { Alert, Field } from '../components/Form';
import { BankIcon, InfoIcon, LockIcon } from '../components/Icons';
import { BANKS } from '../data/vnLocations';

// Chưa có dịch vụ OTP cho thao tác này: dùng mã cố định để demo luồng giao diện.
const DEMO_OTP = '123456';

/** FR-USER-08: tài khoản nhận tiền của Seller; đổi thông tin cần OTP. */
export default function PayoutPage() {
  const { user } = useAuth();
  const [payout, setPayout] = usePayoutAccount(user.id);
  const [mode, setMode] = useState(payout ? 'view' : 'edit');
  const [form, setForm] = useState({ bankCode: '', accountNo: '', holderName: '' });
  const [pending, setPending] = useState(null);
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.bankCode) next.bankCode = 'Chọn ngân hàng.';
    if (!/^\d{6,19}$/.test(form.accountNo.replace(/\s/g, ''))) next.accountNo = 'Số tài khoản gồm 6–19 chữ số.';
    if (form.holderName.trim().length < 3) next.holderName = 'Nhập tên chủ tài khoản.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setPending({ ...form, accountNo: form.accountNo.replace(/\s/g, ''), holderName: form.holderName.trim().toUpperCase() });
    setOtp('');
  };

  const confirm = (e) => {
    e.preventDefault();
    if (otp !== DEMO_OTP) {
      setErrors({ otp: 'Mã OTP không đúng. Vui lòng kiểm tra lại.' });
      return;
    }
    setPayout({ ...pending, updatedAt: new Date().toISOString() });
    setPending(null);
    setErrors({});
    setMode('view');
    setMessage('Đã lưu tài khoản nhận tiền.');
  };

  const startEdit = () => {
    setMessage('');
    setErrors({});
    setForm({ bankCode: payout.bankCode, accountNo: '', holderName: payout.holderName });
    setMode('edit');
  };

  const bankName = BANKS.find(([code]) => code === payout?.bankCode)?.[1];

  return (
    <div className="account-grid">
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Tài khoản nhận tiền</h2>
            <p className="muted">Tiền bán hàng sau khi trừ 10% hoa hồng sẽ được chuyển vào tài khoản này.</p>
          </div>
        </div>
        <Alert type="success">{message}</Alert>

        {pending ? (
          <form onSubmit={confirm} className="otp-box" noValidate>
            <span className="empty-icon">
              <LockIcon size={26} />
            </span>
            <strong>Xác nhận bằng mã OTP</strong>
            <p className="muted">Nhập mã gồm 6 số để {payout ? 'đổi' : 'lưu'} thông tin nhận tiền. Mã có hiệu lực trong 5 phút.</p>
            <Field
              label="Mã OTP"
              className="otp-input"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              error={errors.otp}
              autoFocus
            />
            <small className="muted">Bản demo: dùng mã {DEMO_OTP}.</small>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={otp.length !== 6}>
                Xác nhận
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setPending(null)}>
                Quay lại
              </button>
            </div>
          </form>
        ) : mode === 'view' && payout ? (
          <div className="bank-card">
            <div className="bank-card-top">
              <BankIcon size={26} />
              <span>{bankName ?? payout.bankCode}</span>
            </div>
            <div className="bank-card-number">{maskAccount(payout.accountNo)}</div>
            <div className="bank-card-bottom">
              <div>
                <small>Chủ tài khoản</small>
                <strong>{payout.holderName}</strong>
              </div>
              <button type="button" className="btn btn-cream btn-sm" onClick={startEdit}>
                Đổi thông tin
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="profile-form" noValidate>
            <Field label="Ngân hàng" as="select" value={form.bankCode} onChange={set('bankCode')} error={errors.bankCode}>
              <option value="">Chọn ngân hàng</option>
              {BANKS.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </Field>
            <Field label="Số tài khoản" inputMode="numeric" value={form.accountNo} onChange={set('accountNo')} error={errors.accountNo} autoComplete="off" />
            <Field label="Tên chủ tài khoản (không dấu, viết hoa)" value={form.holderName} onChange={set('holderName')} error={errors.holderName} autoComplete="off" />
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Tiếp tục
              </button>
              {payout && (
                <button type="button" className="btn btn-secondary" onClick={() => setMode('view')}>
                  Huỷ
                </button>
              )}
            </div>
          </form>
        )}
      </section>

      <aside className="account-side">
        <section className="card">
          <h2 className="card-title">
            <InfoIcon size={18} /> Lưu ý
          </h2>
          <ul className="plain-list">
            <li>Bắt buộc có tài khoản nhận tiền trước lần chi trả đầu tiên.</li>
            <li>Tên chủ tài khoản phải trùng với tên đăng ký ngân hàng.</li>
            <li>Số tài khoản được mã hoá và chỉ hiển thị 4 số cuối.</li>
            <li>Mọi thay đổi đều cần xác nhận OTP để tránh bị chiếm quyền.</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
