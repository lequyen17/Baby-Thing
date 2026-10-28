package com.example.babything_api.modules.messages.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.babything_api.modules.messages.entity.Conversation;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    @Query("select c from Conversation c where c.buyerId = :userId or c.sellerId = :userId order by c.lastMessageAt desc, c.id desc")
    List<Conversation> findForUser(@Param("userId") Long userId, Pageable pageable);

    Optional<Conversation> findByBuyerIdAndSellerIdAndProductId(Long buyerId, Long sellerId, Long productId);

    Optional<Conversation> findByBuyerIdAndSellerIdAndProductIdIsNull(Long buyerId, Long sellerId);

    /** [conversationId, số tin chưa đọc] của người dùng, chỉ tính các hội thoại có tin chưa đọc. */
    @Query("""
            select m.conversationId, count(m) from Message m, Conversation c
            where m.conversationId = c.id and m.senderId <> :userId
              and ((c.buyerId = :userId and (c.buyerReadAt is null or m.createdAt > c.buyerReadAt))
                or (c.sellerId = :userId and (c.sellerReadAt is null or m.createdAt > c.sellerReadAt)))
            group by m.conversationId
            """)
    List<Object[]> unreadByConversation(@Param("userId") Long userId);
}
