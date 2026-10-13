package com.example.babything_api.infrastructure.r2;

import java.net.URI;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import com.example.babything_api.config.AppProperties;
import com.example.babything_api.core.exceptions.ApiException;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/**
 * Upload avatar lên bucket R2 qua S3 API. Object public qua {@code R2_PUBLIC_URL} (custom domain hoặc r2.dev).
 */
@Component
public class R2AvatarStorage {

    private static final Logger log = LoggerFactory.getLogger(R2AvatarStorage.class);

    private final AppProperties.R2 config;
    private final S3Client s3;
    private final String publicPrefix;

    public R2AvatarStorage(AppProperties props) {
        this.config = props.r2();
        if (config.enabled()) {
            URI endpoint = URI.create("https://" + config.accountId() + ".r2.cloudflarestorage.com");
            this.s3 = S3Client.builder()
                    .region(Region.US_EAST_1)
                    .endpointOverride(endpoint)
                    .credentialsProvider(StaticCredentialsProvider.create(
                            AwsBasicCredentials.create(config.accessKeyId(), config.secretAccessKey())))
                    .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
                    .build();
            this.publicPrefix = normalizeBaseUrl(config.publicBaseUrl());
        } else {
            this.s3 = null;
            this.publicPrefix = "";
        }
    }

    public boolean enabled() {
        return s3 != null;
    }

    public String publicUrlPrefix() {
        return publicPrefix;
    }

    public String upload(long userId, String contentType, String extension, byte[] bytes) {
        ensureEnabled();
        String key = "avatars/" + userId + "/" + UUID.randomUUID() + "." + extension;
        s3.putObject(
                PutObjectRequest.builder()
                        .bucket(config.bucketName())
                        .key(key)
                        .contentType(contentType)
                        .build(),
                RequestBody.fromBytes(bytes));
        return publicPrefix + "/" + key;
    }

    /** Xóa object cũ nếu URL thuộc bucket public của app (không đụng avatar Google). */
    public void deleteIfOwned(String avatarUrl) {
        if (!enabled() || avatarUrl == null || avatarUrl.isBlank()) {
            return;
        }
        String key = keyFromPublicUrl(avatarUrl);
        if (key == null) {
            return;
        }
        try {
            s3.deleteObject(DeleteObjectRequest.builder()
                    .bucket(config.bucketName())
                    .key(key)
                    .build());
        } catch (Exception e) {
            log.warn("Could not delete old avatar object {}: {}", key, e.getMessage());
        }
    }

    private void ensureEnabled() {
        if (!enabled()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AVATAR_UPLOAD_DISABLED",
                    "Avatar upload is not configured");
        }
    }

    private String keyFromPublicUrl(String avatarUrl) {
        String normalized = avatarUrl.trim();
        String prefix = publicPrefix + "/";
        if (!normalized.startsWith(prefix)) {
            return null;
        }
        String key = normalized.substring(prefix.length());
        if (key.isEmpty() || key.contains("..")) {
            return null;
        }
        return key;
    }

    private static String normalizeBaseUrl(String baseUrl) {
        if (baseUrl == null) {
            return "";
        }
        return baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }
}
