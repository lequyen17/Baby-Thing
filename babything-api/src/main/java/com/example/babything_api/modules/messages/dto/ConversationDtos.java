package com.example.babything_api.modules.messages.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Request / response của module nhắn tin. */
public final class ConversationDtos {

    private ConversationDtos() {
    }

    /** Mở hội thoại từ trang sản phẩm (productId) hoặc từ hồ sơ người bán (sellerId). Cần một trong hai. */
    public record OpenRequest(Long productId, Long sellerId) {
    }

    public record BlockRequest(@NotNull Boolean blocked) {
    }

    public record ReportRequest(@Size(max = 500) String reason) {
    }

    public record Peer(Long id, String name, String avatarUrl) {
    }

    public record ProductRef(Long id, String name, BigDecimal price, String category, String imageUrl) {
    }

    public record MessageResponse(Long id, boolean mine, String text, List<String> images, Instant at) {
    }

    /** role = vai trò của mình (BUYER / SELLER). blocked = mình đã chặn người kia; blockedByPeer = người kia đã chặn mình. messages chỉ có ở chi tiết. */
    public record ConversationResponse(Long id, String role, Peer peer, ProductRef product, boolean blocked, boolean blockedByPeer,
            long unread, MessageResponse lastMessage, Instant updatedAt, List<MessageResponse> messages) {
    }

    public record UnreadCount(long unread) {
    }
}
