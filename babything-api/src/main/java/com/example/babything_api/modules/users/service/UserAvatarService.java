package com.example.babything_api.modules.users.service;

import java.io.IOException;
import java.util.Locale;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.example.babything_api.core.exceptions.ApiException;
import com.example.babything_api.infrastructure.r2.R2AvatarStorage;
import com.example.babything_api.modules.users.entity.User;
import com.example.babything_api.modules.users.repository.UserRepository;

@Service
public class UserAvatarService {

    private static final int MAX_BYTES = 2 * 1024 * 1024;

    private static final Map<String, String> EXT_BY_TYPE = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp",
            "image/gif", "gif");

    private final R2AvatarStorage storage;
    private final UserRepository userRepository;

    public UserAvatarService(R2AvatarStorage storage, UserRepository userRepository) {
        this.storage = storage;
        this.userRepository = userRepository;
    }

    public boolean uploadEnabled() {
        return storage.enabled();
    }

    @Transactional
    public User upload(User user, MultipartFile file) {
        if (!storage.enabled()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AVATAR_UPLOAD_DISABLED",
                    "Avatar upload is not configured");
        }
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "AVATAR_REQUIRED", "Please choose an image file");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "AVATAR_TOO_LARGE", "Image must be 2 MB or smaller");
        }
        String contentType = normalizeContentType(file.getContentType());
        String extension = EXT_BY_TYPE.get(contentType);
        if (extension == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "AVATAR_INVALID_TYPE",
                    "Use JPEG, PNG, WebP, or GIF");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "AVATAR_READ_FAILED", "Could not read uploaded file");
        }
        String previousUrl = user.getAvatarUrl();
        String publicUrl = storage.upload(user.getId(), contentType, extension, bytes);
        if (publicUrl.length() > 500) {
            storage.deleteIfOwned(publicUrl);
            throw new ApiException(HttpStatus.BAD_REQUEST, "AVATAR_URL_TOO_LONG",
                    "Public URL is too long; use a shorter custom domain for R2_PUBLIC_URL");
        }
        user.setAvatarUrl(publicUrl);
        userRepository.save(user);
        storage.deleteIfOwned(previousUrl);
        return user;
    }

    private static String normalizeContentType(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.split(";")[0].trim().toLowerCase(Locale.ROOT);
    }
}
