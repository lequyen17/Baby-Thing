import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Alert } from '../components/Form';
import { EditIcon, PlusIcon, SearchIcon } from '../components/Icons';
import { Pagination } from '../components/Pagination';
import { ProductCard } from '../components/ProductCard';
import { AGE_RANGES, CONDITIONS, PRODUCT_STATUSES } from '../utils/format';

const PAGE_SIZE = 12;

/** "a,b" trên URL → ['a', 'b']. */
const listParam = (value) => (value ? value.split(',').filter(Boolean) : []);

function FilterGroup({ label, children }) {
  return (
    <div className="filter-group" role="group" aria-label={label}>
      <span className="filter-label">{label}</span>
      <div className="chip-group">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button type="button" className={`chip ${active ? 'is-active' : ''}`} aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  );
}

const SORTS = [
  ['newest', 'Mới nhất'],
  ['price_asc', 'Giá: thấp đến cao'],
  ['price_desc', 'Giá: cao đến thấp'],
  ['name_asc', 'Tên: A đến Z'],
  ['name_desc', 'Tên: Z đến A'],
];

/** Bộ lọc nằm trên URL (?q=&category=&sort=&page=) để F5 hoặc bấm Back vẫn giữ nguyên. */
export default function ProductListPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  // ?mine=1: tin đăng của chính mình, thấy và lọc được cả tin đang ẩn (khách chưa đăng nhập thì bỏ qua)
  const mine = Boolean(user) && params.get('mine') === '1';
  const canFilterStatus = isAdmin || mine;
  const status = canFilterStatus ? (params.get('status') ?? '') : '';
  const sort = params.get('sort') ?? 'newest';
  const page = Number(params.get('page') ?? 0) || 0;
  // ?renewed=true: chỉ hàng BabyThings Care đã kiểm tra, làm sạch
  const renewed = params.get('renewed') === 'true';
  // Lọc theo nhu cầu của bé (tài liệu BMC 7.2.1): ?age=M0_6,M6_12&cond=LIKE_NEW&itemSize=80&minPrice=&maxPrice=
  const ages = listParam(params.get('age'));
  const conds = listParam(params.get('cond'));
  const itemSize = params.get('itemSize') ?? '';
  const minPrice = params.get('minPrice') ?? '';
  const maxPrice = params.get('maxPrice') ?? '';
  const filterCount = ages.length + conds.length + (itemSize ? 1 : 0) + (minPrice || maxPrice ? 1 : 0);

  const [search, setSearch] = useState(q);
  const [price, setPrice] = useState({ min: minPrice, max: maxPrice });
  const [categories, setCategories] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => setSearch(q), [q]);
  useEffect(() => setPrice({ min: minPrice, max: maxPrice }), [minPrice, maxPrice]);

  useEffect(() => {
    api('/products/categories')
      .then(setCategories)
      .catch(() => setCategories([]));
    api('/products/sizes')
      .then(setSizes)
      .catch(() => setSizes([]));
  }, []);

  const agesKey = ages.join(',');
  const condsKey = conds.join(',');
  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ sort, page: String(page), size: String(PAGE_SIZE) });
    if (q) query.set('q', q);
    if (category) query.set('category', category);
    if (status) query.set('status', status);
    if (mine) query.set('mine', 'true');
    if (renewed) query.set('renewed', 'true');
    if (agesKey) query.set('ageRange', agesKey);
    if (condsKey) query.set('condition', condsKey);
    if (itemSize) query.set('itemSize', itemSize);
    if (minPrice) query.set('minPrice', minPrice);
    if (maxPrice) query.set('maxPrice', maxPrice);
    setError('');
    api(`/products?${query}`)
      .then((data) => !cancelled && setResult(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [q, category, status, mine, renewed, agesKey, condsKey, itemSize, minPrice, maxPrice, sort, page]);

  /** Đổi bộ lọc thì quay về trang đầu. */
  const updateParams = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  /** Bấm Tìm kiếm áp dụng cả từ khoá lẫn khoảng giá (hai ô giá gõ tay, không lọc theo từng phím). */
  const handleSearch = (e) => {
    e.preventDefault();
    let { min, max } = price;
    if (min && max && Number(min) > Number(max)) [min, max] = [max, min];
    updateParams({ q: search.trim(), minPrice: min, maxPrice: max });
  };

  const toggleIn = (key, values, value) =>
    updateParams({ [key]: (values.includes(value) ? values.filter((v) => v !== value) : [...values, value]).join(',') });

  const clearFilters = () => updateParams({ age: '', cond: '', itemSize: '', minPrice: '', maxPrice: '' });

  return (
    <div className="page">
      <div className="page-header page-header-row">
        <div>
          <h1>{mine ? 'Tin đăng của tôi' : category || (renewed ? 'Hàng Renewed' : 'Tất cả sản phẩm')}</h1>
          <p className="muted">
            {result ? `${result.totalItems} sản phẩm` : 'Đang tải…'}
          </p>
        </div>
        <div className="product-actions">
          <button
            type="button"
            className={`btn ${renewed ? 'btn-dark' : 'btn-secondary'}`}
            aria-pressed={renewed}
            onClick={() => updateParams({ renewed: renewed ? '' : 'true' })}
          >
            Hàng Renewed
          </button>
          {user && (
            <button
              type="button"
              className={`btn ${mine ? 'btn-dark' : 'btn-secondary'}`}
              aria-pressed={mine}
              onClick={() => updateParams({ mine: mine ? '' : '1', status: '' })}
            >
              Tin đăng của tôi
            </button>
          )}
          <Link to="/products/new" className="btn btn-accent">
            <PlusIcon /> Đăng bán
          </Link>
        </div>
      </div>

      <form className="card product-toolbar" onSubmit={handleSearch} role="search">
        <label className="search-box">
          <SearchIcon />
          <input
            type="search"
            placeholder="Tìm theo tên, thương hiệu, mô tả"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tìm sản phẩm"
          />
        </label>
        <select value={category} onChange={(e) => updateParams({ category: e.target.value })} aria-label="Danh mục">
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {canFilterStatus && (
          <select value={status} onChange={(e) => updateParams({ status: e.target.value })} aria-label="Trạng thái">
            <option value="">Mọi trạng thái</option>
            {Object.entries(PRODUCT_STATUSES).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        )}
        <select value={sort} onChange={(e) => updateParams({ sort: e.target.value })} aria-label="Sắp xếp">
          {SORTS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-dark">
          Tìm kiếm
        </button>

        <div className="product-filters">
          <FilterGroup label="Độ tuổi">
            {AGE_RANGES.map(([value, label]) => (
              <Chip key={value} active={ages.includes(value)} onClick={() => toggleIn('age', ages, value)}>
                {label}
              </Chip>
            ))}
          </FilterGroup>
          <FilterGroup label="Tình trạng">
            {CONDITIONS.map(([value, label]) => (
              <Chip key={value} active={conds.includes(value)} onClick={() => toggleIn('cond', conds, value)}>
                {label}
              </Chip>
            ))}
          </FilterGroup>
          <div className="filter-row">
            <label className="filter-field">
              <span>Size</span>
              <select value={itemSize} onChange={(e) => updateParams({ itemSize: e.target.value })}>
                <option value="">Mọi size</option>
                {/* Giữ lựa chọn trên URL dù size đó không còn tin nào */}
                {(itemSize && !sizes.includes(itemSize) ? [itemSize, ...sizes] : sizes).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>Giá từ</span>
              <input
                type="number"
                min="0"
                step="1000"
                inputMode="numeric"
                placeholder="0"
                value={price.min}
                onChange={(e) => setPrice({ ...price, min: e.target.value })}
              />
            </label>
            <label className="filter-field">
              <span>đến</span>
              <input
                type="number"
                min="0"
                step="1000"
                inputMode="numeric"
                placeholder="Không giới hạn"
                value={price.max}
                onChange={(e) => setPrice({ ...price, max: e.target.value })}
              />
            </label>
            {filterCount > 0 && (
              <button type="button" className="link-btn" onClick={clearFilters}>
                Xoá {filterCount} bộ lọc
              </button>
            )}
          </div>
        </div>
      </form>

      <Alert>{error}</Alert>

      {result && result.items.length === 0 && (
        <div className="card empty-state">
          <p className="muted">Không có sản phẩm nào phù hợp bộ lọc.</p>
        </div>
      )}

      {result && result.items.length > 0 && (
        <div className="product-grid">
          {result.items.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              showStatus={canFilterStatus}
              footer={
                // undefined (không phải false) để ProductCard dùng footer mặc định cho tin người khác
                product.sellerId === user?.id && product.care ? (
                  <Link to="/care" className="btn btn-secondary btn-block">
                    Ký gửi Care · lô {product.care.batchCode}
                  </Link>
                ) : product.sellerId === user?.id ? (
                  <Link to={`/products/${product.id}/edit`} state={{ product }} className="btn btn-secondary btn-block">
                    <EditIcon size={16} /> Sửa tin
                  </Link>
                ) : undefined
              }
            />
          ))}
        </div>
      )}

      {result && (
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          onChange={(p) => updateParams({ page: p > 0 ? String(p) : '' })}
        />
      )}
    </div>
  );
}
