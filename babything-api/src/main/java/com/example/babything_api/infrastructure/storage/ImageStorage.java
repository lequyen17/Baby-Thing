package com.example.babything_api.infrastructure.storage;

import java.io.IOException;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import com.example.babything_api.core.exceptions.ApiException;

/**
 * Lưu ảnh người dùng tải lên (avatar, ảnh sản phẩm): đã cấu hình R2 thì đẩy lên R2, chưa thì ghi ra ổ đĩa.
 * Kiểm tra cả Content-Type lẫn byte đầu file, để không lưu file khác giả làm ảnh.
 */
@Component
public class ImageStorage {

    public static final int MAX_BYTES = 2 * 1024 * 1024;

    /** Giới hạn cột *_url trong database. */
    private static final int MAX_URL_LENGTH = 500;

    private static final Map<String, String> EXT_BY_TYPE = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp",
            "image/gif", "gif");

    private final R2Storage r2;
    private final LocalFileStorage local;

    public ImageStorage(R2Storage r2, LocalFileStorage local) {
        this.r2 = r2;
        this.local = local;
    }

    /** folder vd. "products/12"; trả về URL để lưu vào database. */
    public String store(String folder, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw badRequest("IMAGE_REQUIRED", "Vui lòng chọn một file ảnh");
        }
        if (file.getSize() > MAX_BYTES) {
            throw badRequest("IMAGE_TOO_LARGE", "Ảnh phải nhỏ hơn hoặc bằng 2 MB");
        }
        String contentType = normalizeContentType(file.getContentType());
        String extension = EXT_BY_TYPE.get(contentType);
        if (extension == null) {
            throw badRequest("IMAGE_INVALID_TYPE", "Chỉ nhận ảnh JPEG, PNG, WebP hoặc GIF");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw badRequest("IMAGE_READ_FAILED", "Không đọc được file vừa tải lên");
        }
        if (!hasSignature(extension, bytes)) {
            throw badRequest("IMAGE_INVALID_TYPE", "File này không phải là ảnh hợp lệ");
        }
        String key = folder + "/" + UUID.randomUUID() + "." + extension;
        String url = r2.enabled() ? r2.put(key, contentType, bytes) : local.put(key, bytes);
        if (url.length() > MAX_URL_LENGTH) {
            deleteIfOwned(url);
            throw badRequest("IMAGE_URL_TOO_LONG",
                    "Public URL is too long; use a shorter custom domain for R2_PUBLIC_URL");
        }
        return url;
    }

    /** Xoá ảnh cũ nếu do app lưu (bỏ qua URL ngoài như avatar Google). */
    public void deleteIfOwned(String url) {
        if (r2.enabled()) {
            r2.deleteIfOwned(url);
        } else {
            local.deleteIfOwned(url);
        }
    }

    private static boolean hasSignature(String extension, byte[] b) {
        return switch (extension) {
            case "jpg" -> startsWith(b, 0, 0xFF, 0xD8, 0xFF);
            case "png" -> startsWith(b, 0, 0x89, 'P', 'N', 'G');
            case "gif" -> startsWith(b, 0, 'G', 'I', 'F', '8');
            case "webp" -> startsWith(b, 0, 'R', 'I', 'F', 'F') && startsWith(b, 8, 'W', 'E', 'B', 'P');
            default -> false;
        };
    }

    private static boolean startsWith(byte[] bytes, int offset, int... expected) {
        if (bytes.length < offset + expected.length) {
            return false;
        }
        for (int i = 0; i < expected.length; i++) {
            if ((bytes[offset + i] & 0xFF) != expected[i]) {
                return false;
            }
        }
        return true;
    }

    private static String normalizeContentType(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.split(";")[0].trim().toLowerCase(Locale.ROOT);
    }

    private static ApiException badRequest(String code, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, code, message);
    }
}
