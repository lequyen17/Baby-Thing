import { useState } from 'react';
import { apiUpload, api } from '../api/client';
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

/** Bước 2–3: sàng lọc online, báo giá sơ bộ cả lô hoặc không tiếp nhận. */
function ScreenForm({ batch, busy, act }) {
  const desired = batch.items.reduce((s, i) => s + Number(i.desiredPrice), 0);
  const [form, setForm] = useState({ expectedMin: roundK(desired * 0.8), expectedMax: roundK(desired), estimatedFee: 15000 * batch.items.length });
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
        act('screen', { accept: true, expectedMin: num(form.expectedMin), expectedMax: num(form.expectedMax), estimatedFee: num(form.estimatedFee) }, 'Đã gửi báo giá sơ bộ (hoặc đưa vào danh sách chờ nếu kho đầy).');
      }}
    >
      <p className="muted">Tổng giá người bán mong muốn: {formatPrice(desired)}</p>
      <div className="form-grid care-admin-grid">
        <Field label="Giá niêm yết dự kiến từ" type="number" min={0} step={1000} value={form.expectedMin} onChange={set('expectedMin')} />
        <Field label="đến" type="number" min={0} step={1000} value={form.expectedMax} onChange={set('expectedMax')} />
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

function ReceiveForm({ busy, act }) {
  const [note, setNote] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        act('receive', { intakeNote: note }, 'Đã xác nhận nhận hàng vào kho.');
      }}
    >
      <Field as="textarea" label="Tình trạng lúc nhận (đối chiếu khai báo)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
      <div className="product-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Đã nhận hàng
        </button>
      </div>
    </form>
  );
}

/** Bước 6–7: chấm cấp từng món, loại món không đạt, giá niêm yết + giá sàn, phí vệ sinh cuối cùng. */
function QuoteForm({ batch, busy, act }) {
  const [fee, setFee] = useState(batch.cleaningFee ?? batch.estimatedFee ?? 0);
  const [rows, setRows] = useState(() =>
    batch.items.map((i) => ({
      id: i.id,
      accepted: i.status !== 'REJECTED',
      grade: i.grade ?? 'B',
      defects: i.defects ?? '',
      listPrice: i.listPrice ?? i.desiredPrice,
      floorPrice: i.floorPrice ?? roundK(Number(i.listPrice ?? i.desiredPrice) * 0.7),
      rejectReason: i.rejectReason ?? '',
    })),
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
      <ul className="care-quote-list">
        {batch.items.map((item, index) => {
          const r = rows[index];
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
                  <Field label="Giá sàn (ngày 45)" type="number" min={1000} step={1000} value={r.floorPrice} onChange={(e) => update(index, 'floorPrice', e.target.value)} />
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

/** Bước 9–11: ảnh chuẩn sau làm sạch cho từng món đạt rồi đăng lên marketplace với nhãn Renewed. */
function PublishForm({ batch, busy, act }) {
  const accepted = batch.items.filter((i) => i.status === 'ACCEPTED');
  const [images, setImages] = useState(() => Object.fromEntries(accepted.map((i) => [i.id, i.photoUrl ? [i.photoUrl] : []])));
  const [descriptions, setDescriptions] = useState({});
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState('');

  const handleFiles = async (itemId, e) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setUploading(itemId);
    setError('');
    try {
      const urls = [];
      for (const file of files) {
        const data = new FormData();
        data.append('file', await shrinkImage(file));
        urls.push((await apiUpload('/products/images', data)).url);
      }
      setImages((m) => ({ ...m, [itemId]: [...m[itemId], ...urls].slice(0, 10) }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(null);
    }
  };

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
      {error && <p className="field-error">{error}</p>}
      <ul className="care-quote-list">
        {accepted.map((item) => (
          <li key={item.id}>
            <div className="care-quote-head">
              <strong>{item.name}</strong>
              <span className="muted">
                Cấp {item.gradeLabel} · {formatPrice(item.listPrice)}
              </span>
            </div>
            <ul className="image-grid care-image-grid">
              {images[item.id].map((url, index) => (
                <li key={url} className="image-tile">
                  <img src={url} alt={`${item.name} ${index + 1}`} />
                  <button
                    type="button"
                    className="image-tile-remove"
                    onClick={() => setImages((m) => ({ ...m, [item.id]: m[item.id].filter((u) => u !== url) }))}
                    aria-label={`Bỏ ảnh ${index + 1}`}
                  >
                    <XIcon size={14} />
                  </button>
                </li>
              ))}
              <li className="image-tile image-tile-add">
                <input id={`publish-${item.id}`} type="file" accept={IMAGE_ACCEPT} multiple className="visually-hidden" onChange={(e) => handleFiles(item.id, e)} disabled={uploading !== null} />
                <label htmlFor={`publish-${item.id}`}>
                  <PlusIcon size={20} />
                  {uploading === item.id ? 'Đang tải…' : 'Ảnh chuẩn'}
                </label>
              </li>
            </ul>
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
        <button type="submit" className="btn btn-primary" disabled={busy || uploading !== null || accepted.some((i) => images[i.id].length === 0)}>
          QC đạt, đăng bán
        </button>
      </div>
    </form>
  );
}

const TITLES = {
  SUBMITTED: 'Sàng lọc online',
  WAITLISTED: 'Sàng lọc online (danh sách chờ)',
  AWAITING_DROPOFF: 'Nhận hàng vào kho',
  RECEIVED: 'Kiểm tra & báo giá chính thức',
  QUOTED: 'Báo giá chính thức (chờ người bán duyệt)',
  CLEANING: 'Làm sạch, QC & đăng bán',
  RETURNING: 'Hoàn trả hàng',
};

/** Thao tác của admin theo từng bước của lô. */
export default function CareAdminPanel({ batch, busy, run }) {
  const title = TITLES[batch.status];
  if (!title) return null;
  const act = (action, body, message) => run(() => api(`/admin/care/batches/${batch.id}/${action}`, { method: 'POST', body }), message);

  return (
    <section className="card care-admin">
      <h2 className="card-title">Quản trị · {title}</h2>
      {(batch.status === 'SUBMITTED' || batch.status === 'WAITLISTED') && <ScreenForm batch={batch} busy={busy} act={act} />}
      {batch.status === 'AWAITING_DROPOFF' && <ReceiveForm busy={busy} act={act} />}
      {(batch.status === 'RECEIVED' || batch.status === 'QUOTED') && <QuoteForm key={batch.quotedAt ?? 'new'} batch={batch} busy={busy} act={act} />}
      {batch.status === 'CLEANING' && <PublishForm batch={batch} busy={busy} act={act} />}
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
