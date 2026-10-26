package com.example.babything_api.core.dto;

import java.util.List;
import java.util.function.Function;

import org.springframework.data.domain.Page;

/** Không trả thẳng Page của Spring Data để JSON ổn định giữa các phiên bản. page bắt đầu từ 0. */
public record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages) {

    public static <E, T> PageResponse<T> of(Page<E> page, Function<E, T> mapper) {
        return new PageResponse<>(page.getContent().stream().map(mapper).toList(),
                page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }
}
