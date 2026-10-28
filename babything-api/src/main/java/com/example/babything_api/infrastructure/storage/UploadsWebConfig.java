package com.example.babything_api.infrastructure.storage;

import java.util.concurrent.TimeUnit;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Phục vụ ảnh lưu trên ổ đĩa. Tên file là UUID, không bao giờ bị ghi đè, nên cache lâu được. */
@Configuration
public class UploadsWebConfig implements WebMvcConfigurer {

    private final LocalFileStorage local;

    public UploadsWebConfig(LocalFileStorage local) {
        this.local = local;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = local.root().toUri().toString();
        registry.addResourceHandler(LocalFileStorage.URL_PREFIX + "**")
                .addResourceLocations(location.endsWith("/") ? location : location + "/")
                .setCacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable());
    }
}
