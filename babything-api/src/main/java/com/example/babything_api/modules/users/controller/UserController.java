package com.example.babything_api.modules.users.controller;

import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.babything_api.core.security.AuthPrincipal;
import com.example.babything_api.modules.users.dto.PublicProfileResponse;
import com.example.babything_api.modules.users.dto.UpdateProfileRequest;
import com.example.babything_api.modules.users.dto.UserProfileResponse;
import com.example.babything_api.modules.users.service.UserAvatarService;
import com.example.babything_api.modules.users.service.UserProfileService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserAvatarService avatarService;
    private final UserProfileService profileService;

    public UserController(UserAvatarService avatarService, UserProfileService profileService) {
        this.avatarService = avatarService;
        this.profileService = profileService;
    }

    @GetMapping("/me")
    UserProfileResponse me(@AuthenticationPrincipal AuthPrincipal principal) {
        return UserProfileResponse.from(principal.user(), avatarService.uploadEnabled());
    }

    /** Hồ sơ công khai của người bán (FR-USER-10). Tài khoản không tồn tại hoặc không hoạt động trả 404. */
    @GetMapping("/{id}/public")
    PublicProfileResponse publicProfile(@PathVariable Long id) {
        return profileService.publicProfile(id);
    }

    @PatchMapping("/me")
    UserProfileResponse updateMe(@AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody UpdateProfileRequest request) {
        return UserProfileResponse.from(
                profileService.updateDisplayName(principal.user(), request.displayName()),
                avatarService.uploadEnabled());
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    UserProfileResponse uploadAvatar(@AuthenticationPrincipal AuthPrincipal principal,
            @RequestPart("file") MultipartFile file) {
        return UserProfileResponse.from(avatarService.upload(principal.user(), file), avatarService.uploadEnabled());
    }
}
