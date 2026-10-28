package com.example.babything_api.infrastructure.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import com.example.babything_api.config.AppProperties;
import com.example.babything_api.core.exceptions.ApiException;

/**
 * Lưu file vào thư mục app.uploads.dir khi chưa cấu hình R2, phục vụ lại qua {@value #URL_PREFIX}**
 * (xem UploadsWebConfig). Trong Docker thư mục này là volume uploads-data nên không mất khi tạo lại container.
 */
@Component
public class LocalFileStorage {

    public static final String URL_PREFIX = "/api/uploads/";

    private static final Logger log = LoggerFactory.getLogger(LocalFileStorage.class);

    private final Path root;

    public LocalFileStorage(AppProperties props) {
        this.root = Path.of(props.uploads().dir()).toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            log.warn("Could not create uploads directory {}: {}", root, e.getMessage());
        }
    }

    public Path root() {
        return root;
    }

    String put(String key, byte[] bytes) {
        Path target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, bytes, StandardOpenOption.CREATE_NEW);
        } catch (IOException e) {
            log.error("Could not write upload {}", target, e);
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "IMAGE_STORE_FAILED",
                    "Không lưu được ảnh, vui lòng thử lại");
        }
        return URL_PREFIX + key;
    }

    void deleteIfOwned(String url) {
        if (url == null || !url.startsWith(URL_PREFIX)) {
            return;
        }
        Path target = resolve(url.substring(URL_PREFIX.length()));
        if (target == null) {
            return;
        }
        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            log.warn("Could not delete upload {}: {}", target, e.getMessage());
        }
    }

    /** null nếu key thoát ra ngoài thư mục gốc (vd. chứa ".."). */
    private Path resolve(String key) {
        Path path = root.resolve(key).normalize();
        return path.startsWith(root) && !path.equals(root) ? path : null;
    }
}
