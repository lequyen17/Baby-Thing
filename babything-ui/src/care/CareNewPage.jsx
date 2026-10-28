import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, apiUpload } from '../api/client';
import { Alert, Field } from '../components/Form';
import { ArrowLeftIcon, CameraIcon, PlusIcon, TrashIcon, XIcon } from '../components/Icons';
import { AGE_RANGES, formatPrice } from '../utils/format';
import { IMAGE_ACCEPT, shrinkImage } from '../utils/image';
import { DROPOFF_METHODS } from './careFormat';

const emptyItem = () => ({ name: '', category: '', size: '', ageRange: '', brand: '', desiredPrice: '', description: '', photoUrl: '' });

/** Bước 1: người bán khai báo lô 1–5 món kèm ảnh, Baby Things sàng lọc online rồi báo giá sơ bộ. */
export default function CareNewPage() {
  const navigate = useNavigate();
  const [rules, setRules] = useState(null);
  const [dropoffMethod, setDropoffMethod] = useState('SHIP');
  const [note, setNote] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api('/care/rules').then(setRules).catch((err) => setError(err.message));
  }, []);

  const maxItems = rules?.maxItems ?? 5;
  const total = items.reduce((sum, i) => sum + (Number(i.desiredPrice) || 0), 0);
  const tooSmall = rules && total < Number(rules.minLotValue);

  const updateItem = (index, key, value) => setItems((list) => list.map((it, i) => (i === index ? { ...it, [key]: value } : it)));
  const removeItem = (index) => setItems((list) => list.filter((_, i) => i !== index));

  const handlePhoto = async (index, e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(index);
    setError('');
    try {
      const data = new FormData();
      data.append('file', await shrinkImage(file));
      const { url } = await apiUpload('/products/images', data);
      updateItem(index, 'photoUrl', url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (tooSmall) {
      setError(`Tổng giá mong muốn của lô cần từ ${formatPrice(rules.minLotValue)}. Thêm món hoặc gom chung với món khác.`);
      return;
    }
    setSubmitting(true);
    try {
      const batch = await api('/care/batches', {
        method: 'POST',
        body: {
          dropoffMethod,
          note,
          items: items.map((i) => ({ ...i, ageRange: i.ageRange || null, desiredPrice: i.desiredPrice === '' ? null : Number(i.desiredPrice) })),
        },
      });
      navigate(`/care/${batch.id}`, { replace: true, state: { notice: 'Đã gửi đăng ký. Baby Things sẽ sàng lọc và báo giá sơ bộ trong 24 giờ.' } });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="page page-narrow">
      <Link to="/care" className="back-link">
        <ArrowLeftIcon size={16} /> BabyThings Care
      </Link>
      <div className="page-header">
        <h1>Đăng ký ký gửi</h1>
        <p className="muted">
          Khai báo từng món và ảnh chụp sơ bộ. Baby Things xem online, nếu phù hợp sẽ gửi khoảng giá dự kiến và phí vệ sinh để bạn
          đồng ý trước khi gửi hàng.
        </p>
      </div>

      <Alert>{error}</Alert>

      <form className="care-form" onSubmit={handleSubmit} noValidate>
        {items.map((item, index) => (
          <section key={index} className="card care-item-form">
            <div className="care-item-head">
              <h2 className="card-title">Món {index + 1}</h2>
              {items.length > 1 && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeItem(index)}>
                  <TrashIcon size={16} /> Bỏ món
                </button>
              )}
            </div>
            <div className="care-item-body">
              <div className="care-photo">
                {item.photoUrl ? (
                  <div className="image-tile">
                    <img src={item.photoUrl} alt={item.name || `Món ${index + 1}`} />
                    <button type="button" className="image-tile-remove" onClick={() => updateItem(index, 'photoUrl', '')} aria-label="Bỏ ảnh">
                      <XIcon size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="image-tile image-tile-add">
                    <input
                      id={`care-photo-${index}`}
                      type="file"
                      accept={IMAGE_ACCEPT}
                      className="visually-hidden"
                      onChange={(e) => handlePhoto(index, e)}
                      disabled={uploading !== null}
                    />
                    <label htmlFor={`care-photo-${index}`}>
                      <CameraIcon size={22} />
                      {uploading === index ? 'Đang tải…' : 'Ảnh sơ bộ'}
                    </label>
                  </div>
                )}
              </div>
              <div className="form-grid">
                <Field label="Tên món" value={item.name} onChange={(e) => updateItem(index, 'name', e.target.value)} maxLength={200} required placeholder="VD: Bộ body cotton Carter's" />
                <Field as="select" label="Loại hàng" value={item.category} onChange={(e) => updateItem(index, 'category', e.target.value)} required>
                  <option value="">Chọn loại hàng</option>
                  {rules?.categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Field>
                <Field label="Kích cỡ" value={item.size} onChange={(e) => updateItem(index, 'size', e.target.value)} maxLength={30} placeholder="VD: 6-9M" />
                <Field as="select" label="Độ tuổi" value={item.ageRange} onChange={(e) => updateItem(index, 'ageRange', e.target.value)}>
                  <option value="">Không ghi rõ</option>
                  {AGE_RANGES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Field>
                <Field label="Thương hiệu" value={item.brand} onChange={(e) => updateItem(index, 'brand', e.target.value)} maxLength={100} />
                <Field
                  label="Giá mong muốn (đ)"
                  type="number"
                  min={1000}
                  step={1000}
                  value={item.desiredPrice}
                  onChange={(e) => updateItem(index, 'desiredPrice', e.target.value)}
                  required
                />
              </div>
            </div>
            <Field
              as="textarea"
              label="Tình trạng, lỗi nếu có"
              rows={2}
              value={item.description}
              onChange={(e) => updateItem(index, 'description', e.target.value)}
              maxLength={2000}
              placeholder="VD: Mặc 3 lần, không ố, không xù"
            />
          </section>
        ))}

        {items.length < maxItems && (
          <button type="button" className="btn btn-secondary" onClick={() => setItems((list) => [...list, emptyItem()])}>
            <PlusIcon /> Thêm món ({items.length}/{maxItems})
          </button>
        )}

        <section className="card">
          <h2 className="card-title">Cách gửi hàng</h2>
          <div className="choice-list">
            {Object.entries(DROPOFF_METHODS).map(([value, label]) => (
              <label key={value} className={`choice ${dropoffMethod === value ? 'is-active' : ''}`}>
                <input type="radio" name="dropoff" value={value} checked={dropoffMethod === value} onChange={() => setDropoffMethod(value)} />
                {label}
              </label>
            ))}
          </div>
          <Field as="textarea" label="Ghi chú cho Baby Things" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
        </section>

        <section className="card care-submit">
          <div>
            <span className="muted">Tổng giá mong muốn</span>
            <strong className={tooSmall ? 'text-danger' : undefined}>{formatPrice(total)}</strong>
            {rules && <small className="muted">Tối thiểu {formatPrice(rules.minLotValue)} mỗi lô</small>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting || !rules}>
            {submitting ? 'Đang gửi…' : 'Gửi đăng ký'}
          </button>
        </section>
      </form>
    </div>
  );
}
