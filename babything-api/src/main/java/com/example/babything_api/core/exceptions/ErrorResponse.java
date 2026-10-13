package com.example.babything_api.core.exceptions;

import java.util.Map;

public record ErrorResponse(String code, String message, Map<String, String> fields) {

    public ErrorResponse(String code, String message) {
        this(code, message, Map.of());
    }
}
