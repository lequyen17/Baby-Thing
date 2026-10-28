package com.example.babything_api.modules.users.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.example.babything_api.infrastructure.storage.ImageStorage;
import com.example.babything_api.modules.users.entity.User;
import com.example.babything_api.modules.users.repository.UserRepository;

@Service
public class UserAvatarService {

    private final ImageStorage storage;
    private final UserRepository userRepository;

    public UserAvatarService(ImageStorage storage, UserRepository userRepository) {
        this.storage = storage;
        this.userRepository = userRepository;
    }

    /** Luôn bật: chưa cấu hình R2 thì ảnh được lưu trên ổ đĩa của api. */
    public boolean uploadEnabled() {
        return true;
    }

    @Transactional
    public User upload(User user, MultipartFile file) {
        String previousUrl = user.getAvatarUrl();
        user.setAvatarUrl(storage.store("avatars/" + user.getId(), file));
        userRepository.save(user);
        storage.deleteIfOwned(previousUrl);
        return user;
    }
}
