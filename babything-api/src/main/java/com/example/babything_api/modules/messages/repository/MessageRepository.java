package com.example.babything_api.modules.messages.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.babything_api.modules.messages.entity.Message;

public interface MessageRepository extends JpaRepository<Message, Long> {

    /** Các tin mới nhất của hội thoại, mới nhất trước; đảo lại ở service. */
    @Query("select m from Message m where m.conversationId = :conversationId order by m.id desc")
    List<Message> findLatest(@Param("conversationId") Long conversationId, Pageable pageable);

    Optional<Message> findFirstByConversationIdOrderByIdDesc(Long conversationId);
}
