package com.example.babything_api.modules.messages.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.example.babything_api.core.exceptions.ApiException;
import com.example.babything_api.infrastructure.realtime.RealtimeService;
import com.example.babything_api.infrastructure.storage.ImageStorage;
import com.example.babything_api.modules.messages.dto.ConversationDtos.ConversationResponse;
import com.example.babything_api.modules.messages.dto.ConversationDtos.MessageResponse;
import com.example.babything_api.modules.messages.dto.ConversationDtos.Peer;
import com.example.babything_api.modules.messages.dto.ConversationDtos.ProductRef;
import com.example.babything_api.modules.messages.entity.Conversation;
import com.example.babything_api.modules.messages.entity.ConversationReport;
import com.example.babything_api.modules.messages.entity.Message;
import com.example.babything_api.modules.messages.repository.ConversationReportRepository;
import com.example.babything_api.modules.messages.repository.ConversationRepository;
import com.example.babything_api.modules.messages.repository.MessageRepository;
import com.example.babything_api.modules.notifications.service.NotificationService;
import com.example.babything_api.modules.products.entity.Product;
import com.example.babything_api.modules.products.repository.ProductRepository;
import com.example.babything_api.modules.users.entity.User;
import com.example.babything_api.modules.users.entity.UserStatus;
import com.example.babything_api.modules.users.repository.UserRepository;

/**
 * Nhắn tin người mua - người bán (FR-MSG-01..07). Mỗi bộ (người mua, người bán, sản phẩm) một hội thoại; người mua
 * là bên mở. Chỉ hai người trong hội thoại đọc / gửi được; hội thoại không tồn tại hay không thuộc về mình đều
 * trả 404. Có tin mới / đổi trạng thái chặn thì báo cho hai bên qua RealtimeService; client nhận sự kiện rồi tải lại.
 */
@Service
public class MessageService {

    public static final int MAX_TEXT = 1000;
    public static final int MAX_IMAGES = 5;
    private static final int MAX_CONVERSATIONS = 100;
    private static final int MAX_THREAD_MESSAGES = 200;

    private final ConversationRepository conversations;
    private final MessageRepository messages;
    private final ConversationReportRepository reports;
    private final ProductRepository products;
    private final UserRepository users;
    private final ImageStorage storage;
    private final NotificationService notifications;
    private final RealtimeService realtime;

    public MessageService(ConversationRepository conversations, MessageRepository messages,
            ConversationReportRepository reports, ProductRepository products, UserRepository users,
            ImageStorage storage, NotificationService notifications, RealtimeService realtime) {
        this.realtime = realtime;
        this.conversations = conversations;
        this.messages = messages;
        this.reports = reports;
        this.products = products;
        this.users = users;
        this.storage = storage;
        this.notifications = notifications;
    }

    // ---------------------------------------------------------------- Mở / xem

    @Transactional
    public ConversationResponse open(User buyer, Long productId, Long sellerId) {
        Product product = null;
        Long targetSeller = sellerId;
        if (productId != null) {
            product = products.findByIdAndDeletedAtIsNull(productId).orElseThrow(
                    () -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm"));
            targetSeller = product.getCreatedBy();
        }
        if (targetSeller == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SELLER_REQUIRED", "Thiếu người bán để nhắn tin");
        }
        if (targetSeller.equals(buyer.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OWN_LISTING", "Bạn không thể nhắn tin cho chính mình");
        }
        User seller = users.findById(targetSeller).filter(u -> u.getStatus() == UserStatus.ACTIVE).orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "SELLER_NOT_FOUND", "Người bán không còn tồn tại"));

        Long pid = product == null ? null : product.getId();
        Conversation c = (pid == null
                ? conversations.findByBuyerIdAndSellerIdAndProductIdIsNull(buyer.getId(), seller.getId())
                : conversations.findByBuyerIdAndSellerIdAndProductId(buyer.getId(), seller.getId(), pid))
                .orElse(null);
        if (c == null) {
            c = new Conversation();
            c.setBuyerId(buyer.getId());
            c.setSellerId(seller.getId());
            if (product != null) {
                c.setProductId(product.getId());
                c.setProductName(product.getName());
                c.setProductPrice(product.getPrice());
                c.setProductCategory(product.getCategory());
                c.setProductImageUrl(product.getImageUrl());
            }
            c = conversations.saveAndFlush(c);
        }
        return toResponse(buyer.getId(), c, Map.of(seller.getId(), seller, buyer.getId(), buyer), 0, true);
    }

    @Transactional(readOnly = true)
    public List<ConversationResponse> list(User viewer) {
        Long me = viewer.getId();
        List<Conversation> list = conversations.findForUser(me, PageRequest.of(0, MAX_CONVERSATIONS));
        Map<Long, Long> unread = unreadMap(me);
        Map<Long, User> people = usersById(list.stream().map(c -> c.peerOf(me)).collect(Collectors.toSet()));
        return list.stream().map(c -> toResponse(me, c, people, unread.getOrDefault(c.getId(), 0L), false)).toList();
    }

    @Transactional(readOnly = true)
    public long unreadTotal(User viewer) {
        return unreadMap(viewer.getId()).values().stream().mapToLong(Long::longValue).sum();
    }

    /** Hội thoại kèm các tin gần nhất. Việc đánh dấu đã đọc làm riêng ở markRead. */
    @Transactional(readOnly = true)
    public ConversationResponse get(User viewer, Long id) {
        Long me = viewer.getId();
        Conversation c = find(me, id);
        long unread = unreadMap(me).getOrDefault(c.getId(), 0L);
        return toResponse(me, c, usersById(Set.of(c.peerOf(me))), unread, true);
    }

    @Transactional
    public void markRead(User viewer, Long id) {
        Conversation c = find(viewer.getId(), id);
        c.setReadAt(viewer.getId(), Instant.now());
        conversations.save(c);
    }

    // ---------------------------------------------------------------- Gửi / chặn / báo cáo

    @Transactional
    public MessageResponse send(User sender, Long id, String text, List<MultipartFile> files) {
        Conversation c = find(sender.getId(), id);
        if (c.isBlockedBy(sender.getId()) || c.isBlockedByPeer(sender.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "CONVERSATION_BLOCKED",
                    c.isBlockedBy(sender.getId()) ? "Bạn đã chặn người này. Bỏ chặn để tiếp tục nhắn tin"
                            : "Bạn không thể nhắn tin cho người này");
        }
        String body = text == null ? "" : text.strip();
        List<MultipartFile> images = files == null ? List.of() : files.stream().filter(f -> !f.isEmpty()).toList();
        if (body.isEmpty() && images.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MESSAGE_EMPTY", "Tin nhắn không được để trống");
        }
        if (body.length() > MAX_TEXT) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MESSAGE_TOO_LONG",
                    "Tin nhắn tối đa " + MAX_TEXT + " ký tự");
        }
        if (images.size() > MAX_IMAGES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "TOO_MANY_IMAGES", "Mỗi lần gửi tối đa " + MAX_IMAGES + " ảnh");
        }

        List<String> urls = new ArrayList<>();
        try {
            for (MultipartFile f : images) {
                urls.add(storage.store("messages/" + c.getId(), f));
            }
        } catch (RuntimeException e) {
            urls.forEach(storage::deleteIfOwned);
            throw e;
        }

        Message m = new Message();
        m.setConversationId(c.getId());
        m.setSenderId(sender.getId());
        m.setBody(body.isEmpty() ? null : body);
        m.setImages(urls);
        m = messages.saveAndFlush(m);

        c.setLastMessageAt(m.getCreatedAt());
        c.setReadAt(sender.getId(), m.getCreatedAt());
        conversations.save(c);

        notifications.notify(c.peerOf(sender.getId()), NotificationService.MESSAGE,
                sender.getDisplayName() + " đã nhắn cho bạn",
                body.isEmpty() ? "[Hình ảnh]" : body,
                "/messages/" + c.getId());
        notifyConversationChanged(c);
        return toMessage(sender.getId(), m);
    }

    @Transactional
    public void setBlocked(User viewer, Long id, boolean blocked) {
        Conversation c = find(viewer.getId(), id);
        c.setBlockedBy(viewer.getId(), blocked);
        conversations.save(c);
        notifyConversationChanged(c);
    }

    @Transactional
    public void report(User viewer, Long id, String reason) {
        Conversation c = find(viewer.getId(), id);
        if (reports.existsByConversationIdAndReporterId(c.getId(), viewer.getId())) {
            return;
        }
        ConversationReport r = new ConversationReport();
        r.setConversationId(c.getId());
        r.setReporterId(viewer.getId());
        r.setReason(reason == null || reason.isBlank() ? null : reason.strip());
        reports.save(r);
    }

    // ---------------------------------------------------------------- Helpers

    private void notifyConversationChanged(Conversation c) {
        String data = "{\"conversationId\":" + c.getId() + "}";
        realtime.publish(c.getBuyerId(), "message", data);
        realtime.publish(c.getSellerId(), "message", data);
    }

    private Conversation find(Long userId, Long id) {
        return conversations.findById(id).filter(c -> c.isParticipant(userId)).orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "CONVERSATION_NOT_FOUND", "Không tìm thấy hội thoại"));
    }

    private Map<Long, Long> unreadMap(Long userId) {
        Map<Long, Long> result = new HashMap<>();
        for (Object[] row : conversations.unreadByConversation(userId)) {
            result.put((Long) row[0], (Long) row[1]);
        }
        return result;
    }

    private Map<Long, User> usersById(Set<Long> ids) {
        return users.findAllById(ids).stream().collect(Collectors.toMap(User::getId, u -> u));
    }

    private ConversationResponse toResponse(Long me, Conversation c, Map<Long, User> people, long unread,
            boolean withMessages) {
        User peerUser = people.get(c.peerOf(me));
        Peer peer = peerUser == null ? new Peer(c.peerOf(me), "Tài khoản đã xoá", null)
                : new Peer(peerUser.getId(), peerUser.getDisplayName(), peerUser.getAvatarUrl());
        ProductRef product = c.getProductName() == null ? null
                : new ProductRef(c.getProductId(), c.getProductName(), c.getProductPrice(), c.getProductCategory(),
                        c.getProductImageUrl());

        List<MessageResponse> thread = null;
        MessageResponse last;
        if (withMessages) {
            List<Message> latest = new ArrayList<>(
                    messages.findLatest(c.getId(), PageRequest.of(0, MAX_THREAD_MESSAGES)));
            Collections.reverse(latest);
            thread = latest.stream().map(m -> toMessage(me, m)).toList();
            last = thread.isEmpty() ? null : thread.get(thread.size() - 1);
        } else {
            last = messages.findFirstByConversationIdOrderByIdDesc(c.getId()).map(m -> toMessage(me, m)).orElse(null);
        }
        return new ConversationResponse(c.getId(), c.isBuyer(me) ? "BUYER" : "SELLER", peer, product, c.isBlockedBy(me), c.isBlockedByPeer(me), unread,
                last, c.getLastMessageAt(), thread);
    }

    private static MessageResponse toMessage(Long me, Message m) {
        return new MessageResponse(m.getId(), m.getSenderId().equals(me), m.getBody(), m.images(), m.getCreatedAt());
    }
}
