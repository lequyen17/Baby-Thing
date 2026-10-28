package com.example.babything_api.infrastructure.storage;

import java.net.URI;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.example.babything_api.config.AppProperties;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/**
 * Lưu object lên bucket R2 qua S3 API. Object public qua {@code R2_PUBLIC_URL} (custom domain hoặc r2.dev).
 */
@Component
public class R2Storage {

    private static final Logger log = LoggerFactory.getLogger(R2Storage.class);

    private final AppProperties.R2 config;
    private final S3Client s3;
    private final String publicPrefix;

    public R2Storage(AppProperties props) {
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

    /** Trả về URL public của object. Chỉ gọi khi enabled(). */
    String put(String key, String contentType, byte[] bytes) {
        s3.putObject(
                PutObjectRequest.builder()
                        .bucket(config.bucketName())
                        .key(key)
                        .contentType(contentType)
                        .build(),
                RequestBody.fromBytes(bytes));
        return publicPrefix + "/" + key;
    }

    /** Xóa object nếu URL thuộc bucket public của app (không đụng avatar Google). */
    void deleteIfOwned(String url) {
        if (!enabled() || url == null || url.isBlank()) {
            return;
        }
        String key = keyFromPublicUrl(url);
        if (key == null) {
            return;
        }
        try {
            s3.deleteObject(DeleteObjectRequest.builder()
                    .bucket(config.bucketName())
                    .key(key)
                    .build());
        } catch (Exception e) {
            log.warn("Could not delete object {}: {}", key, e.getMessage());
        }
    }

    private String keyFromPublicUrl(String url) {
        String normalized = url.trim();
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
