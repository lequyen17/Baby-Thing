import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, apiUpload } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Alert, Field } from '../components/Form';
import { ArrowLeftIcon } from '../components/Icons';
import { ProductImage } from '../components/ProductImage';
import { CONDITIONS } from '../utils/format';
import { IMAGE_ACCEPT, shrinkImage } from '../utils/image';

const EMPTY_FORM = {
  sku: '',
  name: '',
  description: '',
  price: '',
  stock: '1',
  category: '',
  imageUrl: '',
  condition: '',
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
    imageUrl: product.imageUrl ?? '',
    condition: product.condition ?? '',
    status: product.status,
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
  // Đi từ trang chi tiết sang thì đã có sẵn dữ liệu, khỏi gọi GET (GET sẽ tính thêm một lượt xem)
  const passedProduct = useLocation().state?.product;
  const initial = passedProduct && String(passedProduct.id) === id ? toForm(passedProduct) : null;

  const [form, setForm] = useState(initial ?? EMPTY_FORM);
  const [loaded, setLoaded] = useState(!isEdit || Boolean(initial));
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState('');

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
        if (user.role !== 'ADMIN' && product.sellerId !== user.id) {
          setError('Bạn chỉ sửa được tin đăng của mình');
          return;
        }
        setForm(toForm(product));
        setLoaded(true);
      })
      .catch((err) => setError(err.message));
  }, [id, loaded, user]);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  // Dạng hàm: kết quả upload về sau khi người dùng có thể đã sửa các ô khác
  const setImageUrl = (imageUrl) => setForm((f) => ({ ...f, imageUrl }));

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImageError('');
    setUploading(true);
    try {
      const data = new FormData();
      data.append('file', await shrinkImage(file));
      const { url } = await apiUpload('/products/images', data);
      setImageUrl(url);
    } catch (err) {
      setImageError(err.message);
    } finally {
      setUploading(false);
    }
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
    setSubmitting(true);
    try {
      const body = {
        ...form,
        price: form.price === '' ? null : Number(form.price),
        stock,
        condition: form.condition || null,
      };
      const saved = await api(isEdit ? `/products/${id}` : '/products', {
        method: isEdit ? 'PUT' : 'POST',
        body,
      });
      navigate(`/products/${saved.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      if (err.code === 'SKU_EXISTS') setFieldErrors({ sku: err.message });
      else if (err.code === 'STOCK_CHANGED') setFieldErrors({ stock: err.message });
      else setFieldErrors(err.fields || {});
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <Link to={isEdit ? `/products/${id}` : '/products'} className="back-link">
        <ArrowLeftIcon size={16} /> {isEdit ? 'Quay lại tin đăng' : 'Tất cả sản phẩm'}
      </Link>
      <div className="page-header">
        <h1>{isEdit ? 'Sửa tin đăng' : 'Đăng bán sản phẩm'}</h1>
        <p className="muted">Tin đang ẩn chỉ bạn và quản trị viên nhìn thấy.</p>
      </div>

      <Alert>{error}</Alert>

      {loaded && (
        <form className="card product-form" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <Field
              label="Tên sản phẩm"
              value={form.name}
              onChange={update('name')}
              maxLength={200}
              required
              error={fieldErrors.name}
            />
            <Field
              label="Mã SKU"
              value={form.sku}
              onChange={update('sku')}
              maxLength={64}
              placeholder={isEdit ? 'Để trống để giữ mã hiện tại' : 'Không bắt buộc, để trống sẽ tự tạo'}
              error={fieldErrors.sku}
            />
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
            <Field
              label="Số lượng"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={form.stock}
              onChange={update('stock')}
              required
              error={fieldErrors.stock}
            />
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
            <Field
              as="select"
              label="Tình trạng"
              value={form.condition}
              onChange={update('condition')}
              error={fieldErrors.condition}
            >
              <option value="">Không ghi rõ</option>
              {CONDITIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Field>
            <Field as="select" label="Trạng thái" value={form.status} onChange={update('status')} error={fieldErrors.status}>
              <option value="ACTIVE">Hiển thị cho người mua</option>
              <option value="INACTIVE">Ẩn tin</option>
            </Field>
          </div>

          <div className="image-url-row">
            <div>
              <div className="field">
                <span>Ảnh sản phẩm</span>
                <div className="image-upload-actions">
                  <input
                    id="product-image-file"
                    type="file"
                    accept={IMAGE_ACCEPT}
                    className="visually-hidden"
                    onChange={handleImage}
                    disabled={uploading}
                  />
                  <label
                    htmlFor="product-image-file"
                    className={`btn btn-secondary btn-sm${uploading ? ' is-disabled' : ''}`}
                    aria-disabled={uploading}
                  >
                    {uploading ? 'Đang tải lên…' : form.imageUrl ? 'Đổi ảnh' : 'Tải ảnh lên'}
                  </label>
                  {form.imageUrl && !uploading && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setImageUrl('')}>
                      Bỏ ảnh
                    </button>
                  )}
                </div>
                <small className="muted">JPEG, PNG, WebP hoặc GIF. Ảnh lớn sẽ được tự động thu nhỏ.</small>
                {imageError && <small className="field-error">{imageError}</small>}
              </div>
              <Field
                label="Hoặc dán link ảnh"
                type="url"
                value={form.imageUrl}
                onChange={update('imageUrl')}
                maxLength={500}
                placeholder="https://..."
                error={fieldErrors.imageUrl}
              />
            </div>
            <ProductImage product={{ imageUrl: form.imageUrl.trim(), name: form.name }} className="image-preview" />
          </div>

          <Field
            as="textarea"
            label="Mô tả"
            rows={5}
            value={form.description}
            onChange={update('description')}
            maxLength={5000}
            error={fieldErrors.description}
          />

          <div className="product-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting || uploading}>
              {submitting ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Đăng tin'}
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
