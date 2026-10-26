const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

export function formatDate(value) {
  return value ? dateFormat.format(new Date(value)) : '—';
}

const priceFormat = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

export function formatPrice(value) {
  return value === null || value === undefined ? '—' : priceFormat.format(Number(value));
}
