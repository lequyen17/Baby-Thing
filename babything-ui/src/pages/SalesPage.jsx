import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Alert } from '../components/Form';
import { BankIcon } from '../components/Icons';
import { Pagination } from '../components/Pagination';
import { ProductImage } from '../components/ProductImage';
import { formatDate, formatPercent, formatPrice } from '../utils/format';

const PAGE_SIZE = 10;

export const SETTLEMENT_STATUSES = {
  PENDING: { label: 'Chờ chi trả', badge: 'badge-warning' },
  PAID: { label: 'Đã chi trả', badge: 'badge-success' },
};

export function SettlementStatusBadge({ status }) {
  const info = SETTLEMENT_STATUSES[status] ?? { label: status, badge: '' };
  return <span className={`badge ${info.badge}`}>{info.label}</span>;
}

function Stat({ value, label }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

/** Doanh thu của người bán: mỗi đơn hoàn tất là một khoản = giá bán − hoa hồng, chi trả theo kỳ. */
export default function SalesPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const page = Number(params.get('page') ?? 0) || 0;
  const [result, setResult] = useState(null);
  const [summary, setSummary] = useState(null);
  const [account, setAccount] = useState(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/settlements/summary').then(setSummary).catch(() => setSummary(null));
    api('/payout-account').then(setAccount).catch(() => setAccount(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    if (status) query.set('status', status);
    api(`/settlements?${query}`)
      .then((data) => !cancelled && setResult(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [status, page]);

  const updateParams = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  return (
    <div className="page">
      <div className="page-header page-header-row">
        <div>
          <h1>Doanh thu bán hàng</h1>
          <p className="muted">
            Đơn hoàn tất (người mua xác nhận hoặc hết hạn kiểm hàng) được ghi nhận ở đây, đã trừ{' '}
            {summary ? formatPercent(summary.commissionRate) : '10%'} hoa hồng. Baby Things chi trả theo kỳ hằng tuần.
          </p>
        </div>
        <Link to="/orders?view=selling" className="btn btn-secondary">
          Đơn bán
        </Link>
      </div>

      {account === null && (
        <div className="alert alert-error">
          Bạn chưa khai báo tài khoản nhận tiền. <Link to="/profile/payout">Thêm tài khoản</Link> để nhận tiền bán hàng.
        </div>
      )}

      <section className="stat-grid payment-stats">
        <Stat value={summary ? formatPrice(summary.pendingAmount) : '…'} label={`Chờ chi trả (${summary?.pendingCount ?? 0} đơn)`} />
        <Stat value={summary ? formatPrice(summary.paidAmount) : '…'} label={`Đã nhận (${summary?.paidCount ?? 0} đơn)`} />
        <Stat value={summary ? formatPrice(summary.commissionTotal) : '…'} label="Hoa hồng đã trừ" />
        <Stat
          value={account ? <BankIcon size={22} /> : '—'}
          label={account ? `${account.bankCode} ••••${account.accountNo.slice(-4)}` : 'Chưa có tài khoản nhận tiền'}
        />
      </section>

      <div className="segmented" role="tablist">
        {[['', 'Tất cả'], ...Object.entries(SETTLEMENT_STATUSES).map(([k, v]) => [k, v.label])].map(([value, label]) => (
          <button
            key={value || 'all'}
            type="button"
            role="tab"
            aria-selected={status === value}
            className={status === value ? 'is-active' : undefined}
            onClick={() => updateParams({ status: value })}
          >
            {label}
          </button>
        ))}
      </div>

      <Alert>{error}</Alert>

      {result && result.items.length === 0 && (
        <div className="card empty-state">
          <p className="muted">
            Chưa có khoản nào. Khi người mua xác nhận đã nhận hàng, tiền bán sẽ xuất hiện ở đây.{' '}
            <Link to="/products/new">Đăng bán thêm</Link>
          </p>
        </div>
      )}

      {result && result.items.length > 0 && (
        <ul className="card order-list">
          {result.items.map((s) => (
            <li key={s.id}>
              <Link to={`/orders/${s.orderId}`} className="order-row">
                <ProductImage product={{ imageUrl: s.firstItemImageUrl, name: s.firstItemName }} className="history-thumb" />
                <div className="order-row-info">
                  <div className="order-row-title">
                    <strong>Đơn #{s.orderId}</strong>
                    <SettlementStatusBadge status={s.status} />
                  </div>
                  <span className="order-row-items">
                    {s.firstItemName}
                    {s.itemCount > 1 && ` và ${s.itemCount - 1} sản phẩm khác`}
                  </span>
                  <span className="muted order-row-meta">
                    Giá bán {formatPrice(s.grossAmount)} − hoa hồng {formatPrice(s.commissionAmount)} · Hoàn tất{' '}
                    {formatDate(s.createdAt)}
                    {s.paidAt && ` · Chi trả ${formatDate(s.paidAt)} (mã ${s.payoutReference})`}
                  </span>
                </div>
                <span className="product-price order-row-total">{formatPrice(s.netAmount)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {result && (
        <Pagination page={result.page} totalPages={result.totalPages} onChange={(p) => updateParams({ page: p > 0 ? String(p) : '' })} />
      )}
    </div>
  );
}
