import { useState } from 'react';
import { apiUpload, api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Field } from '../components/Form';
import { PlusIcon, XIcon } from '../components/Icons';
import { formatPercent, formatPrice } from '../utils/format';
import { IMAGE_ACCEPT, shrinkImage } from '../utils/image';
import { CARE_GRADES } from './careFormat';

const COMMISSION = 0.1;
const MAX_COST_RATIO = 0.3;

const roundK = (value) => Math.round(value / 1000) * 1000;
const num = (value) => (value === '' || value == null ? null : Number(value));

/** (hoa hồng + phí vệ sinh) / giá bán, phải ≤ 30%. */
function CostRatio({ total, fee }) {
  if (!total) return null;
  const ratio = (total * COMMISSION + (Number(fee) || 0)) / total;
  return (
    <span className={ratio > MAX_COST_RATIO ? 'text-danger' : 'muted'}>
      Chi phí / giá bán: {formatPercent(ratio)} (tối đa {formatPercent(MAX_COST_RATIO)})
    </span>
  );
}

/** Lưới ảnh tải lên (ảnh lúc nhận hàng, ảnh chuẩn sau làm sạch). */
function PhotoPicker({ id, urls, onChange, label, max = 10 }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files ?? []).slice(0, max - urls.length);
    e.target.value = '';
    if (files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const added = [];
      for (const file of files) {
        const data = new FormData();
        data.append('file', await shrinkImage(file));
        added.push((await apiUpload('/products/images', data)).url);
      }
      onChange([...urls, ...added.filter((u) => !urls.includes(u))].slice(0, max));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <ul className="image-grid care-image-grid">
        {urls.map((url, index) => (
          <li key={url} className="image-tile">
            <img src={url} alt={`${label} ${index + 1}`} />
            <button type="button" className="image-tile-remove" onClick={() => onChange(urls.filter((u) => u !== url))} aria-label={`Bỏ ảnh ${index + 1}`}>
              <XIcon size={14} />
            </button>
          </li>
        ))}
        {urls.length < max && (
          <li className="image-tile image-tile-add">
            <input id={id} type="file" accept={IMAGE_ACCEPT} multiple className="visually-hidden" onChange={handleFiles} disabled={uploading} />
            <label htmlFor={id}>
              <PlusIcon size={20} />
              {uploading ? 'Đang tải…' : label}
            </label>
          </li>
        )}
      </ul>
      {error && <small className="field-error">{error}</small>}
    </div>
  );
}

/** Bước 2–3: sàng lọc online, báo giá sơ bộ cả lô (kèm phạm vi điều chỉnh giá) hoặc không tiếp nhận. */
function ScreenForm({ batch, busy, act }) {
  const desired = batch.items.reduce((s, i) => s + Number(i.desiredPrice), 0);
  const [form, setForm] = useState({
    expectedMin: roundK(desired * 0.8),
    expectedMax: roundK(desired),
    maxDiscount: 30,
    estimatedFee: 15000 * batch.items.length,
  });
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const decline = () => {
    const reason = window.prompt('Lý do không tiếp nhận (gửi cho người bán):', '');
    if (!reason?.trim()) return;
    act('screen', { accept: false, reason }, 'Đã từ chối tiếp nhận lô.');
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        act(
          'screen',
          {
            accept: true,
            expectedMin: num(form.expectedMin),
            expectedMax: num(form.expectedMax),
            maxDiscount: form.maxDiscount === '' ? null : Number(form.maxDiscount) / 100,
            estimatedFee: num(form.estimatedFee),
          },
          'Đã gửi báo giá sơ bộ (hoặc đưa vào danh sách chờ nếu kho đầy).',
        );
      }}
    >
      <p className="muted">Tổng giá người bán mong muốn: {formatPrice(desired)}</p>
      <div className="form-grid care-admin-grid">
        <Field label="Giá niêm yết dự kiến từ" type="number" min={0} step={1000} value={form.expectedMin} onChange={set('expectedMin')} />
        <Field label="đến" type="number" min={0} step={1000} value={form.expectedMax} onChange={set('expectedMax')} />
        <Field label="Phạm vi điều chỉnh (giảm tối đa %)" type="number" min={0} max={50} step={5} value={form.maxDiscount} onChange={set('maxDiscount')} />
        <Field label="Phí vệ sinh dự kiến" type="number" min={0} step={1000} value={form.estimatedFee} onChange={set('estimatedFee')} />
      </div>
      <CostRatio total={Number(form.expectedMin)} fee={form.estimatedFee} />
      <div className="product-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Gửi báo giá sơ bộ
        </button>
        <button type="button" className="btn btn-danger" onClick={decline} disabled={busy}>
          Không tiếp nhận
        </button>
      </div>
    </form>
  );
}

/** Bước 5: biên bản tiếp nhận điện tử — ảnh tình trạng lúc mở hàng (bắt buộc) và đối chiếu khai báo. */
function ReceiveForm({ batch, busy, act }) {
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState([]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        act('receive', { intakeNote: note, imageUrls: photos }, 'Đã nhận hàng và gửi biên bản tiếp nhận cho người bán.');
      }}
    >
      <div className="field">
        <span>Ảnh tình trạng lúc nhận ({photos.length}/20, tối thiểu 1)</span>
        <PhotoPicker id={`intake-${batch.id}`} urls={photos} onChange={setPhotos} label="Ảnh lúc nhận" max={20} />
      </div>
      <Field as="textarea" label="Đối chiếu khai báo (số món, tình trạng, chênh lệch nếu có)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
      <div className="product-actions">
        <button type="submit" className="btn btn-primary" disabled={busy || photos.length === 0}>
          Đã nhận hàng, gửi biên bản
        </button>
      </div>
    </form>
  );
}

/** Bước 6–7: chấm cấp từng món, loại món không đạt, giá niêm yết + giá sàn (trong phạm vi đã thoả thuận), phí vệ sinh. */
function QuoteForm({ batch, busy, act }) {
  const discount = batch.maxDiscount == null ? null : Number(batch.maxDiscount);
  const minFloor = (list) => (discount == null ? 0 : Math.ceil(Number(list) * (1 - discount)));
  const [fee, setFee] = useState(batch.cleaningFee ?? batch.estimatedFee ?? 0);
  const [rows, setRows] = useState(() =>
    batch.items.map((i) => {
      const list = i.listPrice ?? i.desiredPrice;
      return {
        id: i.id,
        accepted: i.status !== 'REJECTED',
        grade: i.grade ?? 'B',
        defects: i.defects ?? '',
        listPrice: list,
        floorPrice: i.floorPrice ?? roundK(Math.max(minFloor(list), Number(list) * 0.7)),
        rejectReason: i.rejectReason ?? '',
      };
    }),
  );
  const update = (index, key, value) => setRows((list) => list.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  const total = rows.filter((r) => r.accepted).reduce((s, r) => s + (Number(r.listPrice) || 0), 0);

  const returnAll = () => {
    const reason = window.prompt('Hoàn trả cả lô vì không món nào đạt? Lý do:', '');
    if (!reason?.trim()) return;
    act('return-all', { reason }, 'Đã chuyển lô sang chờ hoàn trả.');
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        act(
          'quote',
          {
            cleaningFee: num(fee),
            items: rows.map((r) => ({ ...r, listPrice: num(r.listPrice), floorPrice: num(r.floorPrice) })),
          },
          'Đã gửi báo giá chính thức cho người bán.',
        );
      }}
    >
      {discount != null && <p className="muted">Phạm vi điều chỉnh đã thoả thuận: giá sàn thấp hơn giá niêm yết tối đa {formatPercent(discount)}.</p>}
      <ul className="care-quote-list">
        {batch.items.map((item, index) => {
          const r = rows[index];
          const floorTooLow = r.accepted && Number(r.floorPrice) < minFloor(r.listPrice);
          return (
            <li key={item.id} className={r.accepted ? '' : 'is-rejected'}>
              <div className="care-quote-head">
                <strong>
                  {index + 1}. {item.name}
                </strong>
                <span className="muted">mong muốn {formatPrice(item.desiredPrice)}</span>
                <label className="bulk-select">
                  <input type="checkbox" checked={r.accepted} onChange={(e) => update(index, 'accepted', e.target.checked)} /> Đạt
                </label>
              </div>
              {r.accepted ? (
                <div className="form-grid care-admin-grid">
                  <Field as="select" label="Cấp" value={r.grade} onChange={(e) => update(index, 'grade', e.target.value)}>
                    {CARE_GRADES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Field>
                  <Field label="Giá niêm yết" type="number" min={1000} step={1000} value={r.listPrice} onChange={(e) => update(index, 'listPrice', e.target.value)} />
                  <Field
                    label="Giá sàn (ngày 45)"
                    type="number"
                    min={1000}
                    step={1000}
                    value={r.floorPrice}
                    onChange={(e) => update(index, 'floorPrice', e.target.value)}
                    error={floorTooLow ? `Tối thiểu ${formatPrice(minFloor(r.listPrice))}` : undefined}
                  />
                  <Field label="Lỗi nhỏ ghi nhận" value={r.defects} onChange={(e) => update(index, 'defects', e.target.value)} maxLength={1000} placeholder="Không có" />
                </div>
              ) : (
                <Field label="Lý do không đạt" value={r.rejectReason} onChange={(e) => update(index, 'rejectReason', e.target.value)} maxLength={500} placeholder="VD: Ố vàng không làm sạch được" />
              )}
            </li>
          );
        })}
      </ul>
      <div className="form-grid care-admin-grid">
        <Field label="Phí vệ sinh" type="number" min={0} step={1000} value={fee} onChange={(e) => setFee(e.target.value)} />
      </div>
      <p className="care-quote-sum">
        Tổng niêm yết món đạt: <strong>{formatPrice(total)}</strong> · <CostRatio total={total} fee={fee} />
      </p>
      <div className="product-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {batch.status === 'QUOTED' ? 'Gửi lại báo giá' : 'Gửi báo giá chính thức'}
        </button>
        <button type="button" className="btn btn-danger" onClick={returnAll} disabled={busy}>
          Hoàn trả cả lô
        </button>
      </div>
    </form>
  );
}

/** Bước 9: giặt riêng lô theo SOP, ghi người thực hiện. */
function CleanForm({ busy, act }) {
  const { user } = useAuth();
  const [cleanedBy, setCleanedBy] = useState(user.displayName ?? '');
  const [note, setNote] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        act('cleaned', { cleanedBy, note }, 'Đã ghi nhận làm sạch lô.');
      }}
    >
      <p className="muted">
        SOP: phân loại theo màu / chất liệu → xử lý sơ bộ vết bẩn → giặt riêng lô bằng chất giặt cho trẻ em, nhiệt độ theo nhãn → phơi / sấy khô hoàn toàn.
      </p>
      <div className="form-grid care-admin-grid">
        <Field label="Người thực hiện" value={cleanedBy} onChange={(e) => setCleanedBy(e.target.value)} maxLength={100} required />
        <Field label="Ghi chú (chất giặt, nhiệt độ, món cần lưu ý…)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
      </div>
      <div className="product-actions">
        <button type="submit" className="btn btn-primary" disabled={busy || !cleanedBy.trim()}>
          Đã làm sạch
        </button>
      </div>
    </form>
  );
}

/** Bước 10–11: QC sau giặt, ảnh chuẩn cho từng món đạt rồi đăng lên marketplace với nhãn Renewed. */
function PublishForm({ batch, busy, act }) {
  const accepted = batch.items.filter((i) => i.status === 'ACCEPTED');
  const [images, setImages] = useState(() => Object.fromEntries(accepted.map((i) => [i.id, i.photoUrl ? [i.photoUrl] : []])));
  const [descriptions, setDescriptions] = useState({});

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        act(
          'publish',
          { items: accepted.map((i) => ({ id: i.id, imageUrls: images[i.id], description: descriptions[i.id] ?? '' })) },
          'Đã đăng các món lên sàn với nhãn Renewed. Thời hạn ký gửi 60 ngày bắt đầu từ hôm nay.',
        );
      }}
    >
      <p className="muted">QC sau giặt: không còn vết bẩn, không mùi, không hư hại thêm. Đạt QC mới đóng túi, dán mã và đăng bán.</p>
      <ul className="care-quote-list">
        {accepted.map((item) => (
          <li key={item.id}>
            <div className="care-quote-head">
              <strong>{item.name}</strong>
              <span className="muted">
                Cấp {item.gradeLabel} · {formatPrice(item.listPrice)}
              </span>
            </div>
            <PhotoPicker id={`publish-${item.id}`} urls={images[item.id]} onChange={(urls) => setImages((m) => ({ ...m, [item.id]: urls }))} label="Ảnh chuẩn" />
            <Field
              as="textarea"
              label="Mô tả tin đăng (để trống thì dùng mô tả của người bán)"
              rows={2}
              value={descriptions[item.id] ?? ''}
              onChange={(e) => setDescriptions((d) => ({ ...d, [item.id]: e.target.value }))}
              maxLength={2000}
            />
          </li>
        ))}
      </ul>
      <div className="product-actions">
        <button type="submit" className="btn btn-primary" disabled={busy || accepted.some((i) => images[i.id].length === 0)}>
          QC đạt, đăng bán
        </button>
      </div>
    </form>
  );
}

/**
 * Bước 13: điều chỉnh giá món đang bán. Từ giá sàn trở lên áp dụng ngay; thấp hơn giá sàn gửi đề xuất, chờ
 * người bán đồng ý lại.
 */
function RepriceForm({ batch, busy, act }) {
  const selling = batch.items.filter((i) => i.status === 'LISTED' && i.productStock > 0);
  const [prices, setPrices] = useState(() => Object.fromEntries(selling.map((i) => [i.id, i.currentPrice ?? i.listPrice])));
  if (selling.length === 0) return <p className="muted">Không có món nào đang bán để điều chỉnh giá.</p>;

  const changed = selling.filter((i) => Number(prices[i.id]) !== Number(i.currentPrice));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        act(
          'reprice',
          { items: changed.map((i) => ({ id: i.id, price: Number(prices[i.id]) })) },
          'Đã điều chỉnh giá. Giá thấp hơn giá sàn được gửi cho người bán duyệt.',
        );
      }}
    >
      <p className="muted">Từ giá sàn trở lên: áp dụng ngay và báo người bán. Thấp hơn giá sàn: chỉ là đề xuất, người bán phải đồng ý lại.</p>
      <ul className="care-quote-list">
        {selling.map((item) => {
          const below = Number(prices[item.id]) < Number(item.floorPrice);
          return (
            <li key={item.id}>
              <div className="care-quote-head">
                <strong>{item.name}</strong>
                <span className="muted">
                  Đang bán {formatPrice(item.currentPrice)} · giá sàn {formatPrice(item.floorPrice)}
                </span>
              </div>
              <div className="form-grid care-admin-grid">
                <Field
                  label="Giá mới"
                  type="number"
                  min={1000}
                  step={1000}
                  value={prices[item.id]}
                  onChange={(e) => setPrices((p) => ({ ...p, [item.id]: e.target.value }))}
                  error={below ? 'Dưới giá sàn: cần người bán đồng ý' : undefined}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="product-actions">
        <button type="submit" className="btn btn-primary" disabled={busy || changed.length === 0}>
          Điều chỉnh giá
        </button>
      </div>
    </form>
  );
}

function panelTitle(batch) {
  switch (batch.status) {
    case 'SUBMITTED':
      return 'Sàng lọc online';
    case 'WAITLISTED':
      return 'Sàng lọc online (danh sách chờ)';
    case 'AWAITING_DROPOFF':
      return 'Tiếp nhận hàng';
    case 'RECEIVED':
      return 'Kiểm tra & báo giá chính thức';
    case 'QUOTED':
      return 'Báo giá chính thức (chờ người bán duyệt)';
    case 'CLEANING':
      return batch.cleanedAt ? 'QC, chụp ảnh & đăng bán' : 'Làm sạch';
    case 'SELLING':
      return 'Điều chỉnh giá';
    case 'RETURNING':
      return 'Hoàn trả hàng';
    default:
      return null;
  }
}

/** Thao tác của admin theo từng bước của lô. */
export default function CareAdminPanel({ batch, busy, run }) {
  const title = panelTitle(batch);
  if (!title) return null;
  const act = (action, body, message) => run(() => api(`/admin/care/batches/${batch.id}/${action}`, { method: 'POST', body }), message);
  // key theo mốc thời gian để form khởi tạo lại sau mỗi bước
  const key = `${batch.status}-${batch.updatedAt}`;

  return (
    <section className="card care-admin">
      <h2 className="card-title">Quản trị · {title}</h2>
      {(batch.status === 'SUBMITTED' || batch.status === 'WAITLISTED') && <ScreenForm key={key} batch={batch} busy={busy} act={act} />}
      {batch.status === 'AWAITING_DROPOFF' && <ReceiveForm key={key} batch={batch} busy={busy} act={act} />}
      {(batch.status === 'RECEIVED' || batch.status === 'QUOTED') && <QuoteForm key={key} batch={batch} busy={busy} act={act} />}
      {batch.status === 'CLEANING' && !batch.cleanedAt && <CleanForm key={key} busy={busy} act={act} />}
      {batch.status === 'CLEANING' && batch.cleanedAt && <PublishForm key={key} batch={batch} busy={busy} act={act} />}
      {batch.status === 'SELLING' && <RepriceForm key={key} batch={batch} busy={busy} act={act} />}
      {batch.status === 'RETURNING' && (
        <div className="product-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => window.confirm('Xác nhận đã gửi trả các món chưa bán cho người bán?') && act('returned', undefined, 'Đã kết thúc lô.')}
          >
            Đã hoàn trả, kết thúc lô
          </button>
        </div>
      )}
    </section>
  );
}
