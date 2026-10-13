const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

export function formatDate(value) {
  return value ? dateFormat.format(new Date(value)) : '—';
}
