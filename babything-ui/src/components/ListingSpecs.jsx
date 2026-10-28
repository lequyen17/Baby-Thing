import { formatAgeRange, formatCondition } from '../utils/format';

/** Thông số chuẩn hoá của tin đăng; dùng cho trang sản phẩm và bản chụp trong đơn hàng. */
export function ListingSpecs({ item }) {
  const rows = [
    ['Tình trạng', formatCondition(item.condition)],
    ['Lỗi / khuyết điểm', item.defects],
    ['Độ tuổi', formatAgeRange(item.ageRange)],
    ['Kích cỡ', item.size],
    ['Thương hiệu', item.brand],
    ['Đã sử dụng', item.usageDuration],
  ].filter(([, value]) => value);
  if (rows.length === 0) return null;
  return (
    <dl className="spec-list">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
