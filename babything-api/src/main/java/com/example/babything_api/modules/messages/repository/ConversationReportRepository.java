package com.example.babything_api.modules.messages.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.babything_api.modules.messages.entity.ConversationReport;

public interface ConversationReportRepository extends JpaRepository<ConversationReport, Long> {

    boolean existsByConversationIdAndReporterId(Long conversationId, Long reporterId);
}
