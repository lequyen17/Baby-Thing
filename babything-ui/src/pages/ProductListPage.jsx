import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Alert } from '../components/Form';
import { EditIcon, PlusIcon, SearchIcon } from '../components/Icons';
import { Pagination } from '../components/Pagination';
import { ProductCard } from '../components/ProductCard';

const PAGE_SIZE = 12;

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
  const isAdmin = user.role === 'ADMIN';
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  // ?mine=1: tin đăng của chính mình, thấy và lọc được cả tin đang ẩn
  const mine = params.get('mine') === '1';
  const canFilterStatus = isAdmin || mine;
  const status = canFilterStatus ? (params.get('status') ?? '') : '';
  const sort = params.get('sort') ?? 'newest';
  const page = Number(params.get('page') ?? 0) || 0;

  const [search, setSearch] = useState(q);
  const [categories, setCategories] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => setSearch(q), [q]);

  useEffect(() => {
    api('/products/categories')
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ sort, page: String(page), size: String(PAGE_SIZE) });
    if (q) query.set('q', q);
    if (category) query.set('category', category);
    if (status) query.set('status', status);
    if (mine) query.set('mine', 'true');
    setError('');
    api(`/products?${query}`)
      .then((data) => !cancelled && setResult(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [q, category, status, mine, sort, page]);

  /** Đổi bộ lọc thì quay về trang đầu. */
  const updateParams = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateParams({ q: search.trim() });
  };

  return (
    <div className="page">
      <div className="page-header page-header-row">
        <div>
          <h1>{mine ? 'Tin đăng của tôi' : category || 'Tất cả sản phẩm'}</h1>
          <p className="muted">
            {result ? `${result.totalItems} sản phẩm` : 'Đang tải…'}
          </p>
        </div>
        <div className="product-actions">
          <button
            type="button"
            className={`btn ${mine ? 'btn-dark' : 'btn-secondary'}`}
            aria-pressed={mine}
            onClick={() => updateParams({ mine: mine ? '' : '1', status: '' })}
          >
            Tin đăng của tôi
          </button>
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
            placeholder="Tìm theo tên hoặc SKU"
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
            <option value="ACTIVE">Đang hiển thị</option>
            <option value="INACTIVE">Đang ẩn</option>
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
                product.sellerId === user.id ? (
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
