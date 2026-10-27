import { useState } from 'react';
import { useAddresses } from '../account/useAccountData';
import { newId } from '../api/localStore';
import { useAuth } from '../auth/AuthContext';
import { Alert, Field } from '../components/Form';
import { EditIcon, MapPinIcon, PlusIcon, TrashIcon } from '../components/Icons';
import { HANOI_DISTRICTS, PROVINCES } from '../data/vnLocations';

const EMPTY = { type: 'RECEIVE', name: '', phone: '', province: 'Hà Nội', district: '', ward: '', detail: '', isDefault: false };
const TYPES = { RECEIVE: 'Nhận hàng', PICKUP: 'Lấy hàng' };
const PHONE_RE = /^(0|\+84)\d{9}$/;

function AddressForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Nhập tên người nhận.';
    if (!PHONE_RE.test(form.phone.replace(/\s/g, ''))) next.phone = 'Số điện thoại gồm 10 số, ví dụ 0912345678.';
    if (!form.district.trim()) next.district = 'Chọn hoặc nhập quận/huyện.';
    if (!form.ward.trim()) next.ward = 'Nhập phường/xã.';
    if (!form.detail.trim()) next.detail = 'Nhập số nhà, tên đường.';
    setErrors(next);
    if (Object.keys(next).length === 0) onSave({ ...form, phone: form.phone.replace(/\s/g, '') });
  };

  return (
    <form className="card address-form" onSubmit={submit} noValidate>
      <h2 className="card-title">{initial.id ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}</h2>
      <div className="segmented" role="radiogroup" aria-label="Loại địa chỉ">
        {Object.entries(TYPES).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={form.type === value}
            className={form.type === value ? 'is-active' : undefined}
            onClick={() => setForm({ ...form, type: value })}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="form-two">
        <Field label="Họ tên" value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" />
        <Field label="Số điện thoại" value={form.phone} onChange={set('phone')} error={errors.phone} inputMode="tel" autoComplete="tel" />
      </div>
      <div className="form-two">
        <Field label="Tỉnh/thành phố" as="select" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value, district: '' })}>
          {PROVINCES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </Field>
        {form.province === 'Hà Nội' ? (
          <Field label="Quận/huyện" as="select" value={form.district} onChange={set('district')} error={errors.district}>
            <option value="">Chọn quận/huyện</option>
            {HANOI_DISTRICTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </Field>
        ) : (
          <Field label="Quận/huyện" value={form.district} onChange={set('district')} error={errors.district} />
        )}
      </div>
      <Field label="Phường/xã" value={form.ward} onChange={set('ward')} error={errors.ward} />
      <Field label="Số nhà, tên đường" value={form.detail} onChange={set('detail')} error={errors.detail} />
      <label className="check">
        <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
        Đặt làm địa chỉ mặc định
      </label>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          Lưu địa chỉ
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Huỷ
        </button>
      </div>
    </form>
  );
}

/** FR-USER-07: sổ địa chỉ nhận hàng và lấy hàng, mỗi loại có một địa chỉ mặc định. */
export default function AddressesPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useAddresses(user.id);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');

  const save = (data) => {
    const id = data.id ?? newId();
    setAddresses((list) => {
      const isFirstOfType = !list.some((a) => a.type === data.type && a.id !== id);
      const entry = { ...data, id, isDefault: data.isDefault || isFirstOfType };
      // Địa chỉ mới mặc định thì bỏ mặc định của các địa chỉ cùng loại
      const cleared = list.map((a) => (entry.isDefault && a.type === entry.type ? { ...a, isDefault: false } : a));
      return cleared.some((a) => a.id === id) ? cleared.map((a) => (a.id === id ? entry : a)) : [...cleared, entry];
    });
    setEditing(null);
    setMessage('Đã lưu địa chỉ.');
  };

  const remove = (address) => {
    if (!window.confirm('Xoá địa chỉ này?')) return;
    setAddresses((list) => {
      const rest = list.filter((a) => a.id !== address.id);
      const successor = address.isDefault ? rest.find((a) => a.type === address.type) : null;
      return rest.map((a) => (a === successor ? { ...a, isDefault: true } : a));
    });
    setMessage('Đã xoá địa chỉ.');
  };

  const makeDefault = (address) =>
    setAddresses((list) => list.map((a) => (a.type === address.type ? { ...a, isDefault: a.id === address.id } : a)));

  return (
    <div className="stack">
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Sổ địa chỉ</h2>
            <p className="muted">Số điện thoại và địa chỉ chi tiết chỉ chia sẻ cho người còn lại khi cần giao hàng.</p>
          </div>
          {!editing && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setMessage('');
                setEditing(EMPTY);
              }}
            >
              <PlusIcon size={16} /> Thêm địa chỉ
            </button>
          )}
        </div>
        <Alert type="success">{message}</Alert>

        {addresses.length === 0 && !editing ? (
          <div className="empty-block">
            <span className="empty-icon">
              <MapPinIcon size={28} />
            </span>
            <strong>Chưa có địa chỉ nào</strong>
            <p className="muted">Thêm địa chỉ nhận hàng để đặt mua nhanh hơn, hoặc địa chỉ lấy hàng khi bạn bán đồ.</p>
          </div>
        ) : (
          <ul className="address-list">
            {addresses.map((a) => (
              <li key={a.id} className={`address-item${a.isDefault ? ' is-default' : ''}`}>
                <span className="address-pin">
                  <MapPinIcon size={20} />
                </span>
                <div className="address-body">
                  <div className="address-title">
                    <strong>{a.name}</strong>
                    <span className="address-phone">{a.phone}</span>
                    <span className="badge badge-muted">{TYPES[a.type]}</span>
                    {a.isDefault && <span className="badge badge-success">Mặc định</span>}
                  </div>
                  <p className="muted">
                    {a.detail}, {a.ward}, {a.district}, {a.province}
                  </p>
                  {!a.isDefault && (
                    <button type="button" className="link-btn" onClick={() => makeDefault(a)}>
                      Đặt làm mặc định
                    </button>
                  )}
                </div>
                <div className="address-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Sửa địa chỉ"
                    onClick={() => {
                      setMessage('');
                      setEditing(a);
                    }}
                  >
                    <EditIcon size={18} />
                  </button>
                  <button type="button" className="icon-btn" aria-label="Xoá địa chỉ" onClick={() => remove(a)}>
                    <TrashIcon size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && <AddressForm key={editing.id ?? 'new'} initial={editing} onSave={save} onCancel={() => setEditing(null)} />}
    </div>
  );
}
