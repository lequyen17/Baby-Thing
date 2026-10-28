package com.example.babything_api.modules.notifications.dto;

import jakarta.validation.constraints.NotNull;

public record PreferenceRequest(@NotNull Boolean enabled) {
}
