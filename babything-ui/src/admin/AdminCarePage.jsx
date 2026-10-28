import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { CareBatchRow } from '../care/CarePage';
import { CARE_STATUSES } from '../care/careFormat';
import { Alert } from '../components/Form';
import { SearchIcon } from '../components/Icons';
import { Pagination } from '../components/Pagination';
import { formatPrice } from '../utils/format';

const PAGE_SIZE = 20;

/** Kho Care: sức chứa (tối đa 30 lô đang lưu, 20 lô mới / tháng), lô theo bước, tìm theo mã lô / người bán. */
export default function AdminCarePage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const q = params.get('q') ?? '';
  const page = Number(params.get('page') ?? 0) || 0;
  const [stats, setStats] = useState(null);
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState(q);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin/care/stats').then(setStats).catch(() => setStats(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    if (status) query.set('status', status);
    if (q) query.set('q', q);
    api(`/admin/care/batches?${query}`)
      .then((data) => !cancelled && setResult(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [status, q, page]);

  const updateParams = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const total = stats ? Object.values(stats.byStatus).reduce((a, b) => a + b, 0) : 0;

  return (
    <>
      {stats && (
        <section className="care-capacity">
          <div className="card">
            <span className="muted">Lô đang lưu kho</span>
            <strong>
              {stats.stored}/{stats.capacity}
            </strong>
            <meter min={0} max={stats.capacity} value={stats.stored} high={stats.capacity * 0.8} />
          </div>
          <div className="card">
            <span className="muted">Lô mới tháng này</span>
            <strong>
              {stats.monthIntake}/{stats.monthlyLimit}
            </strong>
            <meter min={0} max={stats.monthlyLimit} value={stats.monthIntake} high={stats.monthlyLimit * 0.8} />
          </div>
          <div className="card">
            <span className="muted">Phí vệ sinh đã thu</span>
            <strong>{formatPrice(stats.feesCollected)}</strong>
          </div>
        </section>
      )}

      <div className="status-chips" role="tablist">
        {[['', 'Tất cả', total], ...Object.entries(CARE_STATUSES).map(([k, v]) => [k, v.label, stats?.byStatus[k] ?? 0])].map(([value, label, count]) => (
          <button
            key={value || 'all'}
            type="button"
            role="tab"
            aria-selected={status === value}
            className={status === value ? 'is-active' : undefined}
            onClick={() => updateParams({ status: value })}
          >
            <span>{label}</span>
            <strong>{stats ? count : '…'}</strong>
          </button>
        ))}
      </div>

      <form
        className="card product-toolbar admin-filter"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          updateParams({ q: search.trim() });
        }}
      >
        <label className="search-box">
          <SearchIcon />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Mã lô, tên hoặc email người bán" />
        </label>
        <button type="submit" className="btn btn-secondary">
          Tìm
        </button>
      </form>

      <Alert>{error}</Alert>

      {result && result.items.length === 0 && (
        <div className="card empty-state">
          <p className="muted">Không có lô nào.</p>
        </div>
      )}
      {result && result.items.length > 0 && (
        <ul className="card order-list">
          {result.items.map((b) => (
            <li key={b.id}>
              <CareBatchRow batch={b} to={`/admin/care/${b.id}`} showSeller />
            </li>
          ))}
        </ul>
      )}
      {result && (
        <Pagination page={result.page} totalPages={result.totalPages} onChange={(p) => updateParams({ page: p > 0 ? String(p) : '' })} />
      )}
    </>
  );
}
