package com.example.babything_api.modules.users.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.babything_api.modules.users.entity.User;
import com.example.babything_api.modules.users.repository.UserRepository;

@Service
public class UserProfileService {

    private final UserRepository userRepository;

    public UserProfileService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public User updateDisplayName(User user, String displayName) {
        user.setDisplayName(displayName.trim());
        return userRepository.save(user);
    }
}
