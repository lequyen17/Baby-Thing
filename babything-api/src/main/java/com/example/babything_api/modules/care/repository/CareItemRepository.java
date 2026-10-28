package com.example.babything_api.modules.care.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.babything_api.modules.care.entity.CareItem;

public interface CareItemRepository extends JpaRepository<CareItem, Long> {

    List<CareItem> findByProductIdIn(Collection<Long> productIds);
}
