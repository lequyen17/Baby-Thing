package com.example.babything_api.modules.users.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.babything_api.core.exceptions.ApiException;
import com.example.babything_api.modules.users.dto.PublicProfileResponse;
import com.example.babything_api.modules.users.entity.User;
import com.example.babything_api.modules.users.entity.UserStatus;
import com.example.babything_api.modules.users.repository.UserRepository;

@Service
public class UserProfileService {

    private final UserRepository userRepository;

    public UserProfileService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public PublicProfileResponse publicProfile(Long id) {
        return userRepository.findById(id)
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .map(PublicProfileResponse::from)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy người dùng"));
    }

    @Transactional
    public User updateDisplayName(User user, String displayName) {
        user.setDisplayName(displayName.trim());
        return userRepository.save(user);
    }
}
