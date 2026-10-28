import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Alert } from '../components/Form';
import { ArrowLeftIcon, CardIcon, CheckIcon, ClockIcon, XCircleIcon } from '../components/Icons';
import { ProductImage } from '../components/ProductImage';
import { formatAgeRange, formatDate, formatPercent, formatPrice } from '../utils/format';
import CareAdminPanel from './CareAdminPanel';
import { CARE_ITEM_STATUSES, CARE_STEPS, CareStatusBadge, DROPOFF_METHODS, careStepIndex } from './careFormat';

function CareProgress({ batch }) {
  const current = careStepIndex(batch.status);
  return (
    <ol className="order-progress care-progress">
      {CARE_STEPS.map(([status, timeKey, label], index) => (
        <li key={status} className={index <= current ? 'is-done' : ''} aria-current={index === current ? 'step' : undefined}>
          <span className="order-progress-dot" />
          {label}
          {index <= current && batch[timeKey] && <small className="order-progress-time">{formatDate(batch[timeKey])}</small>}
        </li>
      ))}
    </ol>
  );
}

/** Việc cần làm tiếp theo, viết cho người bán hoặc admin. */
function careHint(batch, isAdmin) {
  switch (batch.status) {
    case 'SUBMITTED':
      return isAdmin ? 'Xem ảnh khai báo, báo giá sơ bộ hoặc từ chối.' : 'Baby Things đang sàng lọc lô của bạn (thường trong 24 giờ).';
    case 'WAITLISTED':
      return isAdmin ? 'Kho đang đầy hoặc hết chỉ tiêu tháng. Báo giá lại khi có chỗ.' : 'Kho Care tạm đầy. Baby Things sẽ báo giá ngay khi có chỗ.';
    case 'PRE_QUOTED':
      return isAdmin ? 'Chờ người bán đồng ý thoả thuận ký gửi.' : 'Xem khoảng giá dự kiến và phí vệ sinh. Đồng ý thoả thuận để gửi hàng cho Baby Things.';
    case 'AWAITING_DROPOFF':
      return isAdmin
        ? 'Khi hàng đến, mở kiện, chụp tình trạng lúc nhận rồi xác nhận đã nhận.'
        : `${DROPOFF_METHODS[batch.dropoffMethod]}. Ghi mã lô ${batch.code} trên kiện hàng.`;
    case 'RECEIVED':
      return isAdmin ? 'Chấm cấp từng món, loại món không đạt và gửi báo giá chính thức.' : 'Baby Things đã nhận hàng và đang kiểm tra từng món.';
    case 'QUOTED':
      return isAdmin
        ? 'Chờ người bán duyệt báo giá và thanh toán phí vệ sinh.'
        : 'Duyệt báo giá và thanh toán phí vệ sinh để bắt đầu làm sạch. Từ chối thì Baby Things hoàn hàng (bạn chịu phí trả).';
    case 'CLEANING':
      return isAdmin ? 'Làm sạch theo SOP, QC, chụp ảnh chuẩn rồi đăng bán.' : 'Đồ đang được làm sạch, kiểm tra lần cuối và chụp ảnh.';
    case 'SELLING':
      return batch.priceDroppedAt
        ? `Đã giảm về giá sàn ngày ${formatDate(batch.priceDroppedAt, true)}. Hết hạn ký gửi ${formatDate(batch.expiresAt, true)}.`
        : `Ngày ${formatDate(batch.priceDropAt, true)} các món chưa bán giảm về giá sàn. Hết hạn ký gửi ${formatDate(batch.expiresAt, true)}.`;
    case 'RETURNING':
      return isAdmin ? 'Gửi trả các món chưa bán / không đạt cho người bán rồi xác nhận đã hoàn trả.' : 'Baby Things đang gửi trả các món chưa bán cho bạn.';
    default:
      return null;
  }
}

function MoneyCard({ batch }) {
  // money luôn có (số 0) nên chỉ coi là báo giá chính thức khi đã báo giá
  const m = batch.quotedAt ? batch.money : null;
  if (!m && batch.expectedMin == null) return null;
  return (
    <section className="card">
      <h2 className="card-title">{m ? 'Báo giá chính thức' : 'Báo giá sơ bộ'}</h2>
      <dl className="care-money">
        {m ? (
          <>
            <dt>Tổng giá niêm yết</dt>
            <dd>{formatPrice(m.listTotal)}</dd>
            <dt>Tổng giá sàn (từ ngày 45)</dt>
            <dd>{formatPrice(m.floorTotal)}</dd>
            <dt>Hoa hồng 10%</dt>
            <dd>−{formatPrice(m.commission)}</dd>
            <dt>Phí vệ sinh {batch.feePaidAt ? '(đã trả)' : '(trả trước)'}</dt>
            <dd>−{formatPrice(m.cleaningFee)}</dd>
            <dt>Chi phí / giá bán</dt>
            <dd>{formatPercent(m.costRatio)}</dd>
            <dt className="care-money-total">Dự kiến nhận nếu bán hết</dt>
            <dd className="care-money-total">{formatPrice(m.estimatedPayout)}</dd>
            {Number(m.soldTotal) > 0 && (
              <>
                <dt>Đã bán</dt>
                <dd>{formatPrice(m.soldTotal)}</dd>
                <dt>Tiền bán đã ghi nhận (trừ hoa hồng)</dt>
                <dd>{formatPrice(m.payoutTotal)}</dd>
              </>
            )}
          </>
        ) : (
          <>
            <dt>Giá niêm yết dự kiến cả lô</dt>
            <dd>
              {formatPrice(batch.expectedMin)} – {formatPrice(batch.expectedMax)}
            </dd>
            <dt>Phí vệ sinh dự kiến</dt>
            <dd>{formatPrice(batch.estimatedFee)}</dd>
            <dt>Hoa hồng</dt>
            <dd>10% giá bán mỗi món</dd>
          </>
        )}
      </dl>
      {batch.feePaymentRef && <p className="muted small-note">Mã thanh toán phí: {batch.feePaymentRef}</p>}
      {Number(m?.soldTotal) > 0 && (
        <p className="muted small-note">
          Tiền bán từng món được chi trả theo kỳ, xem tại <Link to="/sales">Doanh thu</Link>.
        </p>
      )}
    </section>
  );
}

function ItemRow({ item }) {
  const info = CARE_ITEM_STATUSES[item.status] ?? { label: item.status, badge: '' };
  return (
    <li className="care-item">
      <ProductImage product={{ imageUrl: item.photoUrl, name: item.name, category: item.category }} className="history-thumb" />
      <div className="care-item-info">
        <div className="order-row-title">
          <strong>{item.name}</strong>
          <span className={`badge ${info.badge}`}>{info.label}</span>
          {item.grade && <span className="badge badge-renewed">Cấp {item.gradeLabel}</span>}
        </div>
        <span className="muted">
          {[item.category, item.size, formatAgeRange(item.ageRange), item.brand].filter(Boolean).join(' · ')}
        </span>
        {item.description && <span className="muted">Khai báo: {item.description}</span>}
        {item.defects && <span>Lỗi ghi nhận: {item.defects}</span>}
        {item.rejectReason && <span className="text-danger">Không đạt: {item.rejectReason}</span>}
        {item.productId && (
          <Link to={`/products/${item.productId}`} className="small-note">
            Xem tin đăng
          </Link>
        )}
      </div>
      <dl className="care-item-prices">
        <dt>Mong muốn</dt>
        <dd>{formatPrice(item.desiredPrice)}</dd>
        {item.listPrice != null && (
          <>
            <dt>Niêm yết</dt>
            <dd>{formatPrice(item.listPrice)}</dd>
            <dt>Giá sàn</dt>
            <dd>{formatPrice(item.floorPrice)}</dd>
          </>
        )}
        {item.currentPrice != null && item.status === 'LISTED' && (
          <>
            <dt>Đang bán</dt>
            <dd>
              <strong>{formatPrice(item.currentPrice)}</strong>
            </dd>
          </>
        )}
        {item.soldAt && (
          <>
            <dt>Bán ngày</dt>
            <dd>{formatDate(item.soldAt, true)}</dd>
          </>
        )}
      </dl>
    </li>
  );
}

export default function CareBatchPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = user.role === 'ADMIN';
  const [batch, setBatch] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBatch(null);
    api(`/care/batches/${id}`)
      .then(setBatch)
      .catch((err) => setError(err.message));
  }, [id]);

  const run = async (request, message) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      setBatch(await request());
      setNotice(message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const post = (action, body) => () => api(`/care/batches/${id}/${action}`, { method: 'POST', body });

  const isOwner = batch && batch.seller.id === user.id;
  const status = batch?.status;
  const cancellable = ['SUBMITTED', 'WAITLISTED', 'PRE_QUOTED', 'AWAITING_DROPOFF'].includes(status);

  const handleCancel = () => {
    if (!window.confirm(`Huỷ đăng ký lô ${batch.code}?`)) return;
    run(post('cancel'), 'Đã huỷ đăng ký ký gửi.');
  };
  const handleAccept = () => {
    if (!window.confirm(`Duyệt báo giá và thanh toán phí vệ sinh ${formatPrice(batch.cleaningFee)}?`)) return;
    run(post('accept-quote'), 'Đã thanh toán phí vệ sinh. Baby Things bắt đầu làm sạch lô của bạn.');
  };
  const handleReject = () => {
    const reason = window.prompt('Từ chối báo giá? Baby Things sẽ hoàn hàng, bạn chịu phí trả. Lý do (không bắt buộc):', '');
    if (reason === null) return;
    run(post('reject-quote', { reason }), 'Đã từ chối báo giá. Baby Things sẽ gửi trả hàng cho bạn.');
  };
  const handleExtend = () => run(post('extend'), 'Đã gia hạn ký gửi thêm 30 ngày.');
  const handleEnd = () => {
    if (!window.confirm('Dừng ký gửi và nhận lại các món chưa bán? Bạn chịu phí gửi trả.')) return;
    run(post('end'), 'Đã dừng ký gửi. Baby Things sẽ gửi trả các món chưa bán.');
  };

  const hint = batch && careHint(batch, isAdmin && !isOwner);
  const ended = status === 'DECLINED' || status === 'CANCELLED';

  return (
    <div className="page">
      <Link to={isAdmin ? '/admin/care' : '/care'} className="back-link">
        <ArrowLeftIcon size={16} /> {isAdmin ? 'Kho Care' : 'BabyThings Care'}
      </Link>
      <Alert type="success">{notice}</Alert>
      <Alert>{error}</Alert>
      {!batch && !error && <p className="muted">Đang tải…</p>}

      {batch && (
        <>
          <div className="page-header page-header-row">
            <div>
              <h1 className="order-title">
                Lô {batch.code} <CareStatusBadge status={batch.status} />
              </h1>
              <p className="muted">
                Đăng ký {formatDate(batch.createdAt)} · {batch.itemCount} món · {DROPOFF_METHODS[batch.dropoffMethod]}
                {isAdmin && ` · Người bán: ${batch.seller.displayName} (${batch.seller.email})`}
              </p>
            </div>
            {isOwner && (
              <div className="product-actions order-actions">
                {status === 'PRE_QUOTED' && (
                  <button type="button" className="btn btn-primary" onClick={() => run(post('agree'), 'Đã đồng ý thoả thuận. Hãy gửi hàng cho Baby Things.')} disabled={busy}>
                    <CheckIcon /> Đồng ý thoả thuận
                  </button>
                )}
                {status === 'QUOTED' && (
                  <>
                    <button type="button" className="btn btn-primary" onClick={handleAccept} disabled={busy}>
                      <CardIcon /> Duyệt & trả phí {formatPrice(batch.cleaningFee)}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={handleReject} disabled={busy}>
                      Từ chối báo giá
                    </button>
                  </>
                )}
                {status === 'SELLING' && batch.canExtend && (
                  <button type="button" className="btn btn-primary" onClick={handleExtend} disabled={busy}>
                    <ClockIcon /> Gia hạn 30 ngày
                  </button>
                )}
                {status === 'SELLING' && (
                  <button type="button" className="btn btn-secondary" onClick={handleEnd} disabled={busy}>
                    Dừng ký gửi
                  </button>
                )}
                {cancellable && (
                  <button type="button" className="btn btn-danger" onClick={handleCancel} disabled={busy}>
                    <XCircleIcon /> Huỷ đăng ký
                  </button>
                )}
              </div>
            )}
          </div>

          {ended ? (
            <div className="card order-cancelled">
              <strong>
                {status === 'DECLINED' ? 'Không tiếp nhận' : 'Đã huỷ'} lúc {formatDate(batch.closedAt)}
              </strong>
              {batch.declineReason && <p className="muted">Lý do: {batch.declineReason}</p>}
            </div>
          ) : (
            <section className="card">
              <CareProgress batch={batch} />
              {hint && (
                <p className="order-hint">
                  <ClockIcon size={16} /> <span>{hint}</span>
                </p>
              )}
              {batch.returnReason && <p className="muted small-note">Hoàn trả: {batch.returnReason}{batch.returnedAt && ` · đã trả ${formatDate(batch.returnedAt, true)}`}</p>}
            </section>
          )}

          {isAdmin && <CareAdminPanel batch={batch} busy={busy} run={run} />}

          <div className="order-detail-grid">
            <section className="card">
              <h2 className="card-title">Các món trong lô</h2>
              <ul className="care-items">
                {batch.items.map((item) => (
                  <ItemRow key={item.id} item={item} />
                ))}
              </ul>
            </section>
            <div className="care-side">
              <MoneyCard batch={batch} />
              {(batch.sellerNote || batch.intakeNote) && (
                <section className="card">
                  <h2 className="card-title">Ghi chú</h2>
                  {batch.sellerNote && <p>Người bán: {batch.sellerNote}</p>}
                  {batch.intakeNote && <p>Lúc nhận hàng: {batch.intakeNote}</p>}
                </section>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
