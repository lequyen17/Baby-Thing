import { useEffect, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Alert } from '../components/Form';
import { SearchIcon } from '../components/Icons';
import { Pagination } from '../components/Pagination';
import { BANKS } from '../data/vnLocations';
import { formatDate, formatPrice } from '../utils/format';
import { SETTLEMENT_STATUSES, SettlementStatusBadge } from '../pages/SalesPage';

const PAGE_SIZE = 20;

const bankName = (code) => BANKS.find(([c]) => c === code)?.[1] ?? code;

/**
 * Chi trả người bán theo kỳ (tài liệu BMC 7.3.4): chọn các khoản chờ chi trả, chuyển khoản ngoài hệ thống rồi
 * ghi nhận mã giao dịch ngân hàng ở đây.
 */
export default function AdminSettlementsPage() {
  const { refresh } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'PENDING';
  const q = params.get('q') ?? '';
  const page = Number(params.get('page') ?? 0) || 0;
  const [search, setSearch] = useState(q);
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState([]);
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => setSearch(q), [q]);

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    if (status) query.set('status', status);
    if (q) query.set('q', q);
    api(`/admin/settlements?${query}`)
      .then((data) => {
        if (cancelled) return;
        setResult(data);
        setSelected([]);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [status, q, page, version]);

  const updateParams = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value !== undefined ? next.set(key, value) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const payable = result?.items.filter((s) => s.status === 'PENDING') ?? [];
  const toggle = (id) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const allSelected = payable.length > 0 && payable.every((s) => selected.includes(s.id));
  const selectedTotal = payable.filter((s) => selected.includes(s.id)).reduce((sum, s) => sum + Number(s.netAmount), 0);

  const handlePay = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const paid = await api('/admin/settlements/pay', { method: 'POST', body: { ids: selected, reference } });
      setNotice(`Đã ghi nhận chi trả ${paid.length} khoản, mã giao dịch ${reference.trim()}.`);
      setReference('');
      setVersion((v) => v + 1);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="segmented" role="tablist">
        {[['PENDING', SETTLEMENT_STATUSES.PENDING.label], ['PAID', SETTLEMENT_STATUSES.PAID.label], ['', 'Tất cả']].map(([value, label]) => (
          <button
            key={value || 'all'}
            type="button"
            role="tab"
            aria-selected={status === value}
            className={status === value ? 'is-active' : undefined}
            onClick={() => updateParams({ status: value === 'PENDING' ? undefined : value })}
          >
            {label}
          </button>
        ))}
      </div>

      <form
        className="card product-toolbar"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          updateParams({ q: search.trim() || undefined });
        }}
      >
        <label className="search-box">
          <SearchIcon />
          <input
            type="search"
            placeholder="Mã đơn (#12), email hoặc tên người bán"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tìm khoản chi trả"
          />
        </label>
        <button type="submit" className="btn btn-primary">
          Tìm kiếm
        </button>
      </form>

      <Alert type="success">{notice}</Alert>
      <Alert>{error}</Alert>

      {selected.length > 0 && (
        <form className="card payout-bar" onSubmit={handlePay}>
          <span>
            Đã chọn <strong>{selected.length}</strong> khoản · Tổng chuyển <strong>{formatPrice(selectedTotal)}</strong>
          </span>
          <label className="field">
            <span>Mã giao dịch chuyển khoản</span>
            <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} placeholder="VD: FT26302123456" required />
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy || !reference.trim()}>
            Ghi nhận đã chi trả
          </button>
        </form>
      )}

      {result && (
        <div className="table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả khoản chờ chi trả"
                    checked={allSelected}
                    disabled={payable.length === 0}
                    onChange={() => setSelected(allSelected ? [] : payable.map((s) => s.id))}
                  />
                </th>
                <th>Đơn</th>
                <th>Người bán</th>
                <th>Tài khoản nhận</th>
                <th className="num">Giá bán</th>
                <th className="num">Hoa hồng</th>
                <th className="num">Thực trả</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {result.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted">
                    Không có khoản nào.
                  </td>
                </tr>
              )}
              {result.items.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.status === 'PENDING' && (
                      <input type="checkbox" aria-label={`Chọn đơn #${s.orderId}`} checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
                    )}
                  </td>
                  <td>
                    <Link to={`/orders/${s.orderId}`}>#{s.orderId}</Link>
                    <br />
                    <small className="muted">Hoàn tất {formatDate(s.createdAt)}</small>
                  </td>
                  <td>
                    {s.seller ? s.seller.displayName : <span className="muted">Đã xoá</span>}
                    <br />
                    <small className="muted">{s.seller?.email}</small>
                  </td>
                  <td>
                    {s.payoutAccount ? (
                      <>
                        {bankName(s.payoutAccount.bankCode)}
                        <br />
                        <small>
                          {s.payoutAccount.accountNo} · {s.payoutAccount.holderName}
                        </small>
                      </>
                    ) : (
                      <span className="badge badge-danger">Chưa khai báo</span>
                    )}
                  </td>
                  <td className="num">{formatPrice(s.grossAmount)}</td>
                  <td className="num">{formatPrice(s.commissionAmount)}</td>
                  <td className="num">
                    <strong>{formatPrice(s.netAmount)}</strong>
                  </td>
                  <td>
                    <SettlementStatusBadge status={s.status} />
                    {s.paidAt && (
                      <>
                        <br />
                        <small className="muted">
                          {formatDate(s.paidAt)} · {s.payoutReference}
                        </small>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && (
        <Pagination page={result.page} totalPages={result.totalPages} onChange={(p) => updateParams({ page: p > 0 ? String(p) : undefined })} />
      )}
    </>
  );
}
