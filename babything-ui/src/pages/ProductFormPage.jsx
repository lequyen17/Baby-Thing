import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Alert, Field } from '../components/Form';
import { ArrowLeftIcon } from '../components/Icons';
import { ProductImage } from '../components/ProductImage';
import { CONDITIONS } from '../utils/format';

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
          setError('You can only edit your own listings');
          return;
        }
        setForm(toForm(product));
        setLoaded(true);
      })
      .catch((err) => setError(err.message));
  }, [id, loaded, user]);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    const stock = form.stock === '' ? null : Number(form.stock);
    // Jackson tự cắt 1.5 thành 1, nên chặn số lẻ ngay ở đây
    if (stock !== null && !Number.isInteger(stock)) {
      setFieldErrors({ stock: 'Stock must be a whole number' });
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
      setFieldErrors(err.code === 'SKU_EXISTS' ? { sku: err.message } : err.fields || {});
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <Link to={isEdit ? `/products/${id}` : '/products'} className="back-link">
        <ArrowLeftIcon size={16} /> {isEdit ? 'Back to product' : 'All products'}
      </Link>
      <div className="page-header">
        <h1>{isEdit ? 'Edit listing' : 'Sell an item'}</h1>
        <p className="muted">Hidden listings are only visible to you and admins.</p>
      </div>

      <Alert>{error}</Alert>

      {loaded && (
        <form className="card product-form" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <Field
              label="Product name"
              value={form.name}
              onChange={update('name')}
              maxLength={200}
              required
              error={fieldErrors.name}
            />
            <Field
              label="SKU"
              value={form.sku}
              onChange={update('sku')}
              maxLength={64}
              placeholder={isEdit ? 'Leave empty to keep current SKU' : 'Optional, generated if empty'}
              error={fieldErrors.sku}
            />
            <Field
              label="Price (VND)"
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
              label="Stock"
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
              label="Category"
              value={form.category}
              onChange={update('category')}
              maxLength={100}
              list="product-categories"
              placeholder="e.g. Feeding"
              error={fieldErrors.category}
            />
            <datalist id="product-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <Field
              as="select"
              label="Condition"
              value={form.condition}
              onChange={update('condition')}
              error={fieldErrors.condition}
            >
              <option value="">Not specified</option>
              {CONDITIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Field>
            <Field as="select" label="Status" value={form.status} onChange={update('status')} error={fieldErrors.status}>
              <option value="ACTIVE">Visible to customers</option>
              <option value="INACTIVE">Hidden</option>
            </Field>
          </div>

          <div className="image-url-row">
            <Field
              label="Image URL"
              type="url"
              value={form.imageUrl}
              onChange={update('imageUrl')}
              maxLength={500}
              placeholder="https://..."
              error={fieldErrors.imageUrl}
            />
            <ProductImage product={{ imageUrl: form.imageUrl.trim(), name: form.name }} className="image-preview" />
          </div>

          <Field
            as="textarea"
            label="Description"
            rows={5}
            value={form.description}
            onChange={update('description')}
            maxLength={5000}
            error={fieldErrors.description}
          />

          <div className="product-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Post listing'}
            </button>
            <Link to={isEdit ? `/products/${id}` : '/products'} className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
