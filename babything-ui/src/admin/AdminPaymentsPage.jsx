import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Alert } from '../components/Form';
import { SearchIcon } from '../components/Icons';
import { Pagination } from '../components/Pagination';
import { PAYMENT_METHODS, PAYMENT_STATUSES, PaymentStatusBadge } from '../components/PaymentStatus';
import { formatDate, formatPrice } from '../utils/format';

const PAGE_SIZE = 20;

/** Mọi giao dịch trên sàn để đối soát với dữ liệu của cổng thanh toán. */
export default function AdminPaymentsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const method = params.get('method') ?? '';
  const page = Number(params.get('page') ?? 0) || 0;
  const [search, setSearch] = useState(q);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => setSearch(q), [q]);

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    if (q) query.set('q', q);
    if (status) query.set('status', status);
    if (method) query.set('method', method);
    api(`/admin/payments?${query}`)
      .then((data) => !cancelled && setResult(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [q, status, method, page]);

  const updateParams = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  return (
    <>
      <form
        className="card product-toolbar"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          updateParams({ q: search.trim() });
        }}
      >
        <label className="search-box">
          <SearchIcon />
          <input
            type="search"
            placeholder="Mã đơn (#12), mã giao dịch hoặc email người mua"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tìm giao dịch"
          />
        </label>
        <select value={status} onChange={(e) => updateParams({ status: e.target.value })} aria-label="Trạng thái">
          <option value="">Mọi trạng thái</option>
          {Object.entries(PAYMENT_STATUSES).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select value={method} onChange={(e) => updateParams({ method: e.target.value })} aria-label="Hình thức">
          <option value="">Mọi hình thức</option>
          {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary">
          Tìm kiếm
        </button>
      </form>

      <Alert>{error}</Alert>

      {result && (
        <div className="table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th>Mã giao dịch</th>
                <th>Đơn</th>
                <th>Người mua</th>
                <th>Hình thức</th>
                <th>Trạng thái</th>
                <th>Thời điểm</th>
                <th className="num">Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {result.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    Không có giao dịch nào.
                  </td>
                </tr>
              )}
              {result.items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <code>{p.transactionRef}</code>
                    <br />
                    <small className="muted">{p.provider}</small>
                  </td>
                  <td>
                    <Link to={`/orders/${p.order.id}`}>#{p.order.id}</Link>
                    <br />
                    <small className="muted">{p.order.seller ? `Bán: ${p.order.seller.displayName}` : ''}</small>
                  </td>
                  <td>
                    {p.payer.displayName}
                    <br />
                    <small className="muted">{p.payer.email}</small>
                  </td>
                  <td>{PAYMENT_METHODS[p.method] ?? p.method}</td>
                  <td>
                    <PaymentStatusBadge status={p.status} />
                    {p.failureReason && (
                      <>
                        <br />
                        <small className="muted">{p.failureReason}</small>
                      </>
                    )}
                  </td>
                  <td>
                    <small>
                      {formatDate(p.paidAt ?? p.refundedAt ?? p.createdAt)}
                    </small>
                  </td>
                  <td className="num">{formatPrice(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && (
        <Pagination page={result.page} totalPages={result.totalPages} onChange={(p) => updateParams({ page: p > 0 ? String(p) : '' })} />
      )}
    </>
  );
}
