import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Alert } from '../components/Form';
import { PlusIcon, SearchIcon } from '../components/Icons';
import { Pagination } from '../components/Pagination';
import { ProductCard } from '../components/ProductCard';

const PAGE_SIZE = 12;

const SORTS = [
  ['newest', 'Newest'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
  ['name_asc', 'Name: A to Z'],
  ['name_desc', 'Name: Z to A'],
];

/** Bộ lọc nằm trên URL (?q=&category=&sort=&page=) để F5 hoặc bấm Back vẫn giữ nguyên. */
export default function ProductListPage() {
  const { user } = useAuth();
  const isAdmin = user.role === 'ADMIN';
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const status = isAdmin ? (params.get('status') ?? '') : '';
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
    setError('');
    api(`/products?${query}`)
      .then((data) => !cancelled && setResult(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [q, category, status, sort, page]);

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
          <h1>Products</h1>
          <p className="muted">
            {result ? `${result.totalItems} product${result.totalItems === 1 ? '' : 's'}` : 'Loading...'}
          </p>
        </div>
        {isAdmin && (
          <Link to="/products/new" className="btn btn-primary">
            <PlusIcon /> New product
          </Link>
        )}
      </div>

      <form className="card product-toolbar" onSubmit={handleSearch} role="search">
        <label className="search-box">
          <SearchIcon />
          <input
            type="search"
            placeholder="Search by name or SKU"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search products"
          />
        </label>
        <select value={category} onChange={(e) => updateParams({ category: e.target.value })} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {isAdmin && (
          <select value={status} onChange={(e) => updateParams({ status: e.target.value })} aria-label="Status">
            <option value="">All statuses</option>
            <option value="ACTIVE">Visible</option>
            <option value="INACTIVE">Hidden</option>
          </select>
        )}
        <select value={sort} onChange={(e) => updateParams({ sort: e.target.value })} aria-label="Sort by">
          {SORTS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      <Alert>{error}</Alert>

      {result && result.items.length === 0 && (
        <div className="card empty-state">
          <p className="muted">No products match your filters.</p>
        </div>
      )}

      {result && result.items.length > 0 && (
        <div className="product-grid">
          {result.items.map((product) => (
            <ProductCard key={product.id} product={product} showStatus={isAdmin} />
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
