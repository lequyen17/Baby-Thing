import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, apiUpload } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Alert, Field } from '../components/Form';
import { ArrowLeftIcon, InfoIcon, PlusIcon, XIcon } from '../components/Icons';
import { AGE_RANGES, CONDITIONS } from '../utils/format';
import { IMAGE_ACCEPT, shrinkImage } from '../utils/image';

/** Khớp ProductService.MIN_IMAGES / giới hạn 10 ảnh của ProductRequest. */
const MIN_IMAGES = 3;
const MAX_IMAGES = 10;

const EMPTY_FORM = {
  sku: '',
  name: '',
  description: '',
  price: '',
  stock: '1',
  category: '',
  imageUrls: [],
  condition: '',
  brand: '',
  ageRange: '',
  size: '',
  defects: '',
  usageDuration: '',
  status: 'ACTIVE',
  previousStock: null,
};

function toForm(product) {
  return {
    sku: product.sku,
    name: product.name,
    description: product.description ?? '',
    price: String(product.price),
    stock: String(product.stock),
    category: product.category ?? '',
    imageUrls: product.imageUrls?.length ? product.imageUrls : product.imageUrl ? [product.imageUrl] : [],
    condition: product.condition ?? '',
    brand: product.brand ?? '',
    ageRange: product.ageRange ?? '',
    size: product.size ?? '',
    defects: product.defects ?? '',
    usageDuration: product.usageDuration ?? '',
    // Tin chờ duyệt / bị từ chối: lưu lại nghĩa là gửi duyệt lại
    status: product.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    // Server chỉ cộng phần chênh lệch so với số này, để không ghi đè hàng vừa được đặt trong lúc sửa
    previousStock: product.stock,
  };
}

/** Tạo mới (/products/new, mọi thành viên) và sửa (/products/:id/edit, người bán hoặc ADMIN). */
export default function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user.role === 'ADMIN';
  // Đi từ trang chi tiết sang thì đã có sẵn dữ liệu, khỏi gọi GET (GET sẽ tính thêm một lượt xem)
  const passedProduct = useLocation().state?.product;
  const initial = passedProduct && String(passedProduct.id) === id ? passedProduct : null;

  const [form, setForm] = useState(initial ? toForm(initial) : EMPTY_FORM);
  const [rejectReason, setRejectReason] = useState(initial?.status === 'REJECTED' ? initial.rejectReason : '');
  const [loaded, setLoaded] = useState(!isEdit || Boolean(initial));
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [linkInput, setLinkInput] = useState('');

  useEffect(() => {
    api('/products/categories')
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (loaded) return;
    api(`/products/${id}`)
      .then((product) => {
        // Server cũng chặn (403), báo sớm để khỏi điền form vô ích
        if (!isAdmin && product.sellerId !== user.id) {
          setError('Bạn chỉ sửa được tin đăng của mình');
          return;
        }
        setForm(toForm(product));
        setRejectReason(product.status === 'REJECTED' ? product.rejectReason : '');
        setLoaded(true);
      })
      .catch((err) => setError(err.message));
  }, [id, loaded, user, isAdmin]);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  // Dạng hàm: kết quả upload về sau khi người dùng có thể đã sửa các ô khác
  const addImages = (urls) =>
    setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, ...urls.filter((u) => !f.imageUrls.includes(u))].slice(0, MAX_IMAGES) }));
  const removeImage = (url) => setForm((f) => ({ ...f, imageUrls: f.imageUrls.filter((u) => u !== url) }));
  const makeCover = (url) => setForm((f) => ({ ...f, imageUrls: [url, ...f.imageUrls.filter((u) => u !== url)] }));

  const handleImages = async (e) => {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_IMAGES - form.imageUrls.length);
    e.target.value = '';
    if (files.length === 0) return;
    setImageError('');
    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const data = new FormData();
        data.append('file', await shrinkImage(file));
        const { url } = await apiUpload('/products/images', data);
        urls.push(url);
      }
      addImages(urls);
    } catch (err) {
      setImageError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddLink = () => {
    const url = linkInput.trim();
    if (!/^https?:\/\/\S+$/.test(url)) {
      setImageError('Link ảnh phải bắt đầu bằng http:// hoặc https://');
      return;
    }
    setImageError('');
    addImages([url]);
    setLinkInput('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    const stock = form.stock === '' ? null : Number(form.stock);
    // Jackson tự cắt 1.5 thành 1, nên chặn số lẻ ngay ở đây
    if (stock !== null && !Number.isInteger(stock)) {
      setFieldErrors({ stock: 'Số lượng phải là số nguyên' });
      return;
    }
    if (!isAdmin && form.imageUrls.length < MIN_IMAGES) {
      setImageError(`Cần tối thiểu ${MIN_IMAGES} ảnh thật, gồm ảnh cận lỗi nếu có.`);
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        ...form,
        price: form.price === '' ? null : Number(form.price),
        stock,
        condition: form.condition || null,
        ageRange: form.ageRange || null,
      };
      const saved = await api(isEdit ? `/products/${id}` : '/products', {
        method: isEdit ? 'PUT' : 'POST',
        body,
      });
      const notice =
        saved.status === 'PENDING_REVIEW'
          ? 'Tin đã được gửi duyệt. Baby Things sẽ kiểm tra trong vòng 24 giờ.'
          : 'Đã lưu tin đăng.';
      navigate(`/products/${saved.id}`, { replace: true, state: { notice } });
    } catch (err) {
      setError(err.message);
      if (err.code === 'SKU_EXISTS') setFieldErrors({ sku: err.message });
      else if (err.code === 'STOCK_CHANGED') setFieldErrors({ stock: err.message });
      else if (err.code === 'NOT_ENOUGH_IMAGES') setImageError(err.message);
      else setFieldErrors(err.fields || {});
      setSubmitting(false);
    }
  };

  const required = !isAdmin;

  return (
    <div className="page">
      <Link to={isEdit ? `/products/${id}` : '/products'} className="back-link">
        <ArrowLeftIcon size={16} /> {isEdit ? 'Quay lại tin đăng' : 'Tất cả sản phẩm'}
      </Link>
      <div className="page-header">
        <h1>{isEdit ? 'Sửa tin đăng' : 'Đăng bán sản phẩm'}</h1>
        <p className="muted">
          {isAdmin
            ? 'Tin do quản trị viên lưu được hiển thị ngay, không cần duyệt.'
            : 'Tin mới hoặc vừa sửa sẽ được Baby Things kiểm duyệt (thường trong 24 giờ) trước khi hiển thị cho người mua.'}
        </p>
      </div>

      <Alert>{error}</Alert>
      {rejectReason && (
        <div className="alert alert-error">
          <strong>Tin bị từ chối:</strong> {rejectReason}. Sửa lại theo góp ý rồi lưu để gửi duyệt lại.
        </div>
      )}

      {loaded && (
        <form className="card product-form" onSubmit={handleSubmit} noValidate>
          <h2 className="card-title">Thông tin sản phẩm</h2>
          <div className="form-grid">
            <Field label="Tên sản phẩm" value={form.name} onChange={update('name')} maxLength={200} required error={fieldErrors.name} />
            <Field
              label="Danh mục"
              value={form.category}
              onChange={update('category')}
              maxLength={100}
              list="product-categories"
              placeholder="VD: Xe đẩy"
              error={fieldErrors.category}
            />
            <datalist id="product-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <Field label="Thương hiệu" value={form.brand} onChange={update('brand')} maxLength={100} placeholder="VD: Combi, Joie, Carter's" error={fieldErrors.brand} />
            <Field as="select" label="Độ tuổi phù hợp" value={form.ageRange} onChange={update('ageRange')} required={required} error={fieldErrors.ageRange}>
              <option value="">{required ? 'Chọn độ tuổi' : 'Không ghi rõ'}</option>
              {AGE_RANGES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Field>
            <Field label="Kích cỡ / size" value={form.size} onChange={update('size')} maxLength={30} placeholder="VD: 73cm, size 3, 6-9M" error={fieldErrors.size} />
            <Field label="Thời gian đã sử dụng" value={form.usageDuration} onChange={update('usageDuration')} maxLength={50} placeholder="VD: 4 tháng" error={fieldErrors.usageDuration} />
          </div>

          <h2 className="card-title">Tình trạng</h2>
          <div className="form-grid">
            <Field as="select" label="Cấp tình trạng" value={form.condition} onChange={update('condition')} required={required} error={fieldErrors.condition}>
              <option value="">{required ? 'Chọn tình trạng' : 'Không ghi rõ'}</option>
              {CONDITIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Field>
            <Field
              label="Lỗi / khuyết điểm"
              value={form.defects}
              onChange={update('defects')}
              maxLength={1000}
              placeholder='Ghi rõ vết bẩn, xước, phai màu... hoặc "Không có"'
              required={required}
              error={fieldErrors.defects}
            />
          </div>

          <div className="field">
            <span>
              Ảnh thật của sản phẩm{' '}
              <em className="field-counter">
                {form.imageUrls.length}/{MAX_IMAGES}
                {!isAdmin && ` · tối thiểu ${MIN_IMAGES}`}
              </em>
            </span>
            <ul className="image-grid">
              {form.imageUrls.map((url, index) => (
                <li key={url} className="image-tile">
                  <img src={url} alt={`Ảnh ${index + 1}`} />
                  {index === 0 ? (
                    <span className="image-tile-cover">Ảnh bìa</span>
                  ) : (
                    <button type="button" className="image-tile-cover is-action" onClick={() => makeCover(url)}>
                      Đặt làm bìa
                    </button>
                  )}
                  <button type="button" className="image-tile-remove" onClick={() => removeImage(url)} aria-label={`Bỏ ảnh ${index + 1}`}>
                    <XIcon size={14} />
                  </button>
                </li>
              ))}
              {form.imageUrls.length < MAX_IMAGES && (
                <li className="image-tile image-tile-add">
                  <input
                    id="product-image-file"
                    type="file"
                    accept={IMAGE_ACCEPT}
                    multiple
                    className="visually-hidden"
                    onChange={handleImages}
                    disabled={uploading}
                  />
                  <label htmlFor="product-image-file" aria-disabled={uploading}>
                    <PlusIcon size={22} />
                    {uploading ? 'Đang tải…' : 'Thêm ảnh'}
                  </label>
                </li>
              )}
            </ul>
            <small className="muted">Chụp ảnh thật, đủ sáng; có lỗi thì thêm ảnh cận lỗi. Không dùng ảnh mạng.</small>
            {imageError && <small className="field-error">{imageError}</small>}
            {fieldErrors.imageUrls && <small className="field-error">{fieldErrors.imageUrls}</small>}
          </div>
          <div className="inline-add">
            <Field label="Hoặc dán link ảnh" type="url" value={linkInput} onChange={(e) => setLinkInput(e.target.value)} maxLength={500} placeholder="https://..." />
            <button type="button" className="btn btn-secondary" onClick={handleAddLink} disabled={!linkInput.trim()}>
              Thêm link
            </button>
          </div>

          <Field as="textarea" label="Mô tả" rows={5} value={form.description} onChange={update('description')} maxLength={5000} error={fieldErrors.description} />

          <h2 className="card-title">Giá bán</h2>
          <div className="form-grid">
            <Field
              label="Giá (VND)"
              type="number"
              min="0"
              step="1000"
              inputMode="decimal"
              value={form.price}
              onChange={update('price')}
              required
              error={fieldErrors.price}
            />
            <Field label="Số lượng" type="number" min="0" step="1" inputMode="numeric" value={form.stock} onChange={update('stock')} required error={fieldErrors.stock} />
            <Field
              label="Mã SKU"
              value={form.sku}
              onChange={update('sku')}
              maxLength={64}
              placeholder={isEdit ? 'Để trống để giữ mã hiện tại' : 'Không bắt buộc, để trống sẽ tự tạo'}
              error={fieldErrors.sku}
            />
            <Field as="select" label="Sau khi lưu" value={form.status} onChange={update('status')} error={fieldErrors.status}>
              <option value="ACTIVE">{isAdmin ? 'Hiển thị cho người mua' : 'Gửi duyệt để hiển thị'}</option>
              <option value="INACTIVE">Lưu ở chế độ ẩn</option>
            </Field>
          </div>
          {form.price !== '' && Number(form.price) > 0 && (
            <p className="muted fee-hint">
              <InfoIcon size={14} /> Bán được, bạn nhận khoảng{' '}
              <strong>{new Intl.NumberFormat('vi-VN').format(Math.round(Number(form.price) * 0.9))}đ</strong> mỗi món sau khi
              trừ 10% hoa hồng. Không thu phí đăng tin.
            </p>
          )}

          <div className="product-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting || uploading}>
              {submitting ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : isAdmin ? 'Đăng tin' : 'Gửi duyệt'}
            </button>
            <Link to={isEdit ? `/products/${id}` : '/products'} className="btn btn-secondary">
              Huỷ
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
