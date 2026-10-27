// Hình minh hoạ nét mảnh (viewBox 64x64) và màu nền cho từng nhóm danh mục
const ICONS = {
  stroller:
    'M14 30a18 18 0 0 1 18-18v18z M14 30h32l-4 10H20z M46 30l6-14h4 M18 48a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M38 48a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
  chair: 'M22 10h20v20H22z M18 30h28 M22 30l-6 24 M42 30l6 24 M19 44h26',
  crib: 'M10 18h44v30H10z M18 18v30 M26 18v30 M34 18v30 M42 18v30 M10 48v6 M54 48v6',
  clothes: 'M24 10h16l12 8-6 8-4-2v28H22V24l-4 2-6-8z M28 10a4 4 0 0 0 8 0',
  toy: 'M10 32h20v20H10z M34 32h20v20H34z M22 10h20v20H22z',
  carseat: 'M22 12h16a4 4 0 0 1 4 4v20l8 8v8H14v-8l6-6V16a4 4 0 0 1 2-4z M14 52h36 M26 24h10',
  bottle: 'M27 6h10v6H27z M24 12h16l2 6v32a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4V18z M22 30h20 M22 40h20',
  bath: 'M8 30h48v8a14 14 0 0 1-14 14H22A14 14 0 0 1 8 38z M14 30V14a6 6 0 0 1 12 0 M20 52l-3 6 M44 52l3 6',
  diaper: 'M10 18h44v10a22 22 0 0 1-44 0z M10 22h44 M22 34a10 10 0 0 0 20 0',
  box: 'M10 22l22-10 22 10v24L32 56 10 46z M10 22l22 10 22-10 M32 32v24',
};

export const TINTS = ['#F6E3DA', '#E1ECE4', '#F5EBC9', '#DDE8F0'];

const RULES = [
  [/stroll|xe đẩy|xe day/i, 'stroller'],
  [/chair|ghế ăn|high/i, 'chair'],
  [/sleep|crib|nôi|cũi|bed/i, 'crib'],
  [/cloth|quần|áo|wear/i, 'clothes'],
  [/toy|đồ chơi/i, 'toy'],
  [/car ?seat|ô tô/i, 'carseat'],
  [/feed|bottle|bình|ăn dặm|sữa/i, 'bottle'],
  [/bath|tắm/i, 'bath'],
  [/diaper|bỉm|tã/i, 'diaper'],
];

function hash(text) {
  text = text ?? '';
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

/** Trả về { icon, tint } cho tên danh mục bất kỳ (không khớp thì dùng hình hộp). */
export function categoryArt(category) {
  const match = RULES.find(([re]) => re.test(category ?? ''));
  return { icon: ICONS[match ? match[1] : 'box'], tint: TINTS[hash(category) % TINTS.length] };
}

export function CategoryGlyph({ category, size = 76 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={categoryArt(category).icon} />
    </svg>
  );
}
