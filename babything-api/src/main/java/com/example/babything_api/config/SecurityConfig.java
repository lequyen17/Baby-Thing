package com.example.babything_api.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import jakarta.servlet.http.HttpServletResponse;

import com.example.babything_api.core.security.JwtAuthFilter;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .logout(logout -> logout.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/auth/register", "/api/auth/register/**",
                                "/api/auth/login", "/api/auth/login/**",
                                "/api/auth/refresh", "/api/auth/logout",
                                "/api/auth/forgot-password", "/api/auth/reset-password",
                                "/api/auth/google", "/api/auth/google/**",
                                "/api/docs/**", "/api/swagger-ui/**", "/api/swagger-ui.html",
                                "/error")
                        .permitAll()
                        // Ảnh lưu trên ổ đĩa: <img> không gửi kèm access token
                        .requestMatchers(HttpMethod.GET, "/api/uploads/**").permitAll()
                        // Khách chưa đăng nhập (vd. bấm link từ Facebook) xem được tin đăng và hồ sơ người bán;
                        // mua, nhắn tin, đăng bán vẫn phải đăng nhập
                        .requestMatchers(HttpMethod.GET,
                                "/api/products", "/api/products/categories", "/api/products/sizes","/api/products/{id:\\d+}",
                                "/api/users/{id:\\d+}/public")
                        .permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        // Sản phẩm: mọi thành viên đăng bán được; quyền sửa/xoá theo chủ tin kiểm tra trong ProductService
                        // Đơn hàng: quyền người mua / người bán / admin kiểm tra trong OrderService
                        .anyRequest().authenticated())
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, e) -> writeError(response,
                                HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Vui lòng đăng nhập"))
                        .accessDeniedHandler((request, response, e) -> writeError(response,
                                HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này")))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private static void writeError(HttpServletResponse response, HttpStatus status, String code, String message)
            throws IOException {
        response.setStatus(status.value());
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"code\":\"" + code + "\",\"message\":\"" + message + "\"}");
    }

    /** Filter chỉ chạy trong Security chain, không để Spring Boot đăng ký thêm làm servlet filter. */
    @Bean
    FilterRegistrationBean<JwtAuthFilter> jwtAuthFilterRegistration(JwtAuthFilter filter) {
        FilterRegistrationBean<JwtAuthFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
