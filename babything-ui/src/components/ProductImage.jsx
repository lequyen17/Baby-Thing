import { useState } from 'react';
import { CategoryGlyph } from '../utils/categoryArt';

/** Ảnh sản phẩm; không có URL hoặc tải lỗi thì hiện icon thay thế. */
export function ProductImage({ product, className = '' }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const url = product.imageUrl;

  if (!url || failedUrl === url) {
    return (
      <div className={`product-image product-image-fallback ${className}`}>
        <CategoryGlyph category={product.category} size={96} />
      </div>
    );
  }
  return (
    <img
      className={`product-image ${className}`}
      src={url}
      alt={product.name}
      loading="lazy"
      onError={() => setFailedUrl(url)}
    />
  );
}
