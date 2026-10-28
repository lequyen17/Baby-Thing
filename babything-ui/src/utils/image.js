/** Định dạng ảnh server nhận (xem ImageStorage). */
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_SIDE = 1600;

/**
 * Ảnh chụp điện thoại thường vài MB: thu nhỏ cạnh dài về MAX_SIDE và nén JPEG trước khi tải lên.
 * Ảnh đã nhỏ thì giữ nguyên. Trình duyệt không đọc được (vd. HEIC) thì gửi nguyên file để server báo lỗi.
 */
export async function shrinkImage(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= MAX_BYTES && IMAGE_ACCEPT.split(',').includes(file.type)) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  // JPEG không có nền trong suốt: tô trắng để ảnh PNG không bị nền đen
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]*$/, '') + '.jpg', { type: 'image/jpeg' });
}
