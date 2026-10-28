package com.example.babything_api.modules.settlements.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.babything_api.modules.settlements.entity.PayoutAccount;

public interface PayoutAccountRepository extends JpaRepository<PayoutAccount, Long> {

    List<PayoutAccount> findByUserIdIn(Collection<Long> userIds);
}
