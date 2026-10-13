package com.example.babything_api.modules.auth.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.example.babything_api.modules.auth.entity.UserIdentity;

public interface UserIdentityRepository extends JpaRepository<UserIdentity, Long> {

    @EntityGraph(attributePaths = "user")
    Optional<UserIdentity> findByProviderAndProviderUserId(UserIdentity.Provider provider, String providerUserId);

    boolean existsByUserIdAndProvider(Long userId, UserIdentity.Provider provider);
}
