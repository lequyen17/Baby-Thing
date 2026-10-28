import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Alert } from '../components/Form';
import { DropletIcon, PlusIcon, SparkleIcon, TagIcon } from '../components/Icons';
import { Pagination } from '../components/Pagination';
import { ProductImage } from '../components/ProductImage';
import { formatDate, formatPercent, formatPrice } from '../utils/format';
import { CareStatusBadge } from './careFormat';

const PAGE_SIZE = 10;

/** Dòng tóm tắt một lô, dùng chung cho trang người bán và kho Care của admin. */
export function CareBatchRow({ batch, to, showSeller = false }) {
  const first = batch.items[0];
  return (
    <Link to={to} className="order-row">
      <ProductImage product={{ imageUrl: first?.photoUrl, name: first?.name, category: first?.category }} className="history-thumb" />
      <div className="order-row-info">
        <div className="order-row-title">
          <strong>Lô {batch.code}</strong>
          <CareStatusBadge status={batch.status} />
        </div>
        <span className="order-row-items">
          {batch.items.map((i) => i.name).join(', ')}
        </span>
        <span className="muted order-row-meta">
          {showSeller && `${batch.seller.displayName} · `}
          {batch.itemCount} món · Đăng ký {formatDate(batch.createdAt, true)}
          {batch.status === 'SELLING' && ` · Đã bán ${batch.soldCount}/${batch.itemCount} · Hết hạn ${formatDate(batch.expiresAt, true)}`}
        </span>
      </div>
      <span className="product-price order-row-total">
        {batch.quotedAt && Number(batch.money?.listTotal) ? formatPrice(batch.money.listTotal) : batch.expectedMin ? `từ ${formatPrice(batch.expectedMin)}` : '—'}
      </span>
    </Link>
  );
}

/** BabyThings Care: người bán gửi đồ, Baby Things kiểm tra, làm sạch, chụp ảnh và bán hộ. */
export default function CarePage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? 0) || 0;
  const [rules, setRules] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/care/rules').then(setRules).catch(() => setRules(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    api(`/care/batches?page=${page}&size=${PAGE_SIZE}`)
      .then((data) => !cancelled && setResult(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <div className="page">
      <div className="page-header page-header-row">
        <div>
          <h1>BabyThings Care</h1>
          <p className="muted">
            Gửi đồ cho Baby Things bán hộ: chúng tôi kiểm tra, làm sạch, chụp ảnh chuẩn và đăng bán với nhãn <strong>Renewed</strong>.
            Hàng vẫn là của bạn cho đến khi bán được.
          </p>
        </div>
        <Link to="/care/new" className="btn btn-primary">
          <PlusIcon /> Đăng ký ký gửi
        </Link>
      </div>

      {rules && (
        <section className="care-rules">
          <div className="card">
            <TagIcon size={22} />
            <strong>Lô {rules.maxItems > 1 ? `1–${rules.maxItems}` : 1} món, từ {formatPrice(rules.minLotValue)}</strong>
            <span className="muted">Nhận {rules.categories.join(', ').toLowerCase()}, loại vải giặt được.</span>
          </div>
          <div className="card">
            <DropletIcon size={22} />
            <strong>Hoa hồng {formatPercent(rules.commissionRate)} + phí vệ sinh</strong>
            <span className="muted">Tổng chi phí không quá {formatPercent(rules.maxCostRatio)} giá bán. Phí vệ sinh trả trước khi làm sạch.</span>
          </div>
          <div className="card">
            <SparkleIcon size={22} />
            <strong>Bán trong {rules.consignmentDays} ngày</strong>
            <span className="muted">
              Ngày {rules.priceDropDay} giảm về giá sàn đã thoả thuận. Gia hạn 1 lần thêm {rules.extensionDays} ngày, hoặc nhận lại hàng chưa bán.
            </span>
          </div>
        </section>
      )}

      <Alert>{error}</Alert>

      {result && result.items.length === 0 && (
        <div className="card empty-state">
          <p className="muted">
            Bạn chưa có lô ký gửi nào. <Link to="/care/new">Đăng ký lô đầu tiên</Link>
          </p>
        </div>
      )}

      {result && result.items.length > 0 && (
        <ul className="card order-list">
          {result.items.map((b) => (
            <li key={b.id}>
              <CareBatchRow batch={b} to={`/care/${b.id}`} />
            </li>
          ))}
        </ul>
      )}

      {result && (
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          onChange={(p) => setParams(p > 0 ? { page: String(p) } : {})}
        />
      )}
    </div>
  );
}
