package com.example.babything_api.modules.users.controller;

import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.babything_api.core.security.AuthPrincipal;
import com.example.babything_api.modules.users.dto.UserProfileResponse;
import com.example.babything_api.modules.users.service.UserAvatarService;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserAvatarService avatarService;

    public UserController(UserAvatarService avatarService) {
        this.avatarService = avatarService;
    }

    @GetMapping("/me")
    UserProfileResponse me(@AuthenticationPrincipal AuthPrincipal principal) {
        return UserProfileResponse.from(principal.user(), avatarService.uploadEnabled());
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    UserProfileResponse uploadAvatar(@AuthenticationPrincipal AuthPrincipal principal,
            @RequestPart("file") MultipartFile file) {
        return UserProfileResponse.from(avatarService.upload(principal.user(), file), avatarService.uploadEnabled());
    }
}
