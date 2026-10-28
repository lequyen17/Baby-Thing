import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { ArrowLeftIcon, CameraIcon, InfoIcon, MessageIcon, SearchIcon, XIcon } from '../components/Icons';
import { categoryArt } from '../utils/categoryArt';
import { formatPrice, timeAgo } from '../utils/format';
import { MAX_IMAGES, MAX_TEXT, hasOffPlatformContact, useMessages, useThread } from './useMessages';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const asUser = (peer) => ({ displayName: peer.name, avatarUrl: peer.avatarUrl });

function ConversationList({ conversations, loading, activeId, onSelect }) {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.peer.name.toLowerCase().includes(q) || c.product?.name.toLowerCase().includes(q));
  }, [conversations, query]);

  return (
    <div className="chat-list">
      <div className="chat-list-head">
        <h1>Tin nhắn</h1>
        <label className="chat-search">
          <SearchIcon size={18} />
          <input type="search" placeholder="Tìm theo tên hoặc sản phẩm" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Tìm hội thoại" />
        </label>
      </div>
      {shown.length === 0 ? (
        <p className="muted chat-list-empty">{loading ? 'Đang tải…' : query ? 'Không tìm thấy hội thoại phù hợp.' : 'Chưa có hội thoại nào. Mở một sản phẩm và bấm "Nhắn tin" để bắt đầu.'}</p>
      ) : (
        <ul>
          {shown.map((c) => {
            const last = c.lastMessage;
            const unread = c.unread;
            return (
              <li key={c.id}>
                <button type="button" className={`chat-row${c.id === activeId ? ' is-active' : ''}${unread ? ' is-unread' : ''}`} onClick={() => onSelect(c.id)}>
                  <Avatar user={asUser(c.peer)} size={44} />
                  <span className="chat-row-text">
                    <span className="chat-row-top">
                      <strong>{c.peer.name}</strong>
                      {last && <small>{timeAgo(last.at)}</small>}
                    </span>
                    <span className="chat-row-product">{c.product?.name}</span>
                    <span className="chat-row-preview">{last ? `${last.mine ? 'Bạn: ' : ''}${last.text || '[Hình ảnh]'}` : 'Hãy gửi tin nhắn đầu tiên'}</span>
                  </span>
                  {unread > 0 && <span className="count-pill">{unread}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ProductStrip({ product }) {
  if (!product) return null;
  return (
    <Link to={`/products/${product.id}`} className="chat-product" aria-label={`Xem sản phẩm ${product.name}`}>
      <span className="chat-product-thumb" style={{ background: categoryArt(product.category).tint }}>
        {product.imageUrl ? <img src={product.imageUrl} alt="" /> : <MessageIcon size={18} />}
      </span>
      <div>
        <strong>{product.name}</strong>
        <span className="product-price">{formatPrice(product.price)}</span>
      </div>
    </Link>
  );
}

function Thread({ conversation, onBack, onSend, onBlock, onReport }) {
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  const [reported, setReported] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [conversation.messages.length, conversation.id]);

  useEffect(() => {
    setText('');
    setImages([]);
    setError('');
    setReported(false);
  }, [conversation.id]);

  const warn = hasOffPlatformContact(text);

  const pickImages = (e) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = '';
    setError('');
    if (images.length + files.length > MAX_IMAGES) return setError(`Mỗi lần gửi tối đa ${MAX_IMAGES} ảnh.`);
    if (files.some((f) => !f.type.startsWith('image/'))) return setError('Chỉ gửi được file ảnh.');
    if (files.some((f) => f.size > MAX_IMAGE_BYTES)) return setError('Mỗi ảnh tối đa 5 MB.');
    setImages((prev) => [...prev, ...files.map((f) => ({ file: f, name: f.name, url: URL.createObjectURL(f) }))]);
  };

  const submit = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if ((!body && images.length === 0) || sending) return;
    setSending(true);
    setError('');
    try {
      await onSend(body, images.map((i) => i.file));
      images.forEach((i) => URL.revokeObjectURL(i.url));
      setText('');
      setImages([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const blocked = conversation.blocked;

  return (
    <div className="chat-thread">
      <header className="chat-thread-head">
        <button type="button" className="icon-btn chat-back" onClick={onBack} aria-label="Quay lại danh sách">
          <ArrowLeftIcon size={20} />
        </button>
        <Avatar user={asUser(conversation.peer)} size={40} />
        <div className="chat-thread-title">
          <strong>{conversation.peer.name}</strong>
          <small className="muted">{conversation.role === 'SELLER' ? 'Người mua' : 'Người bán'}</small>
        </div>
        <div className="chat-thread-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onReport().then(() => setReported(true), (err) => setError(err.message))} disabled={reported}>
            {reported ? 'Đã báo cáo' : 'Báo cáo'}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onBlock(!blocked)}>
            {blocked ? 'Bỏ chặn' : 'Chặn'}
          </button>
        </div>
      </header>

      <ProductStrip product={conversation.product} />

      <div className="chat-messages" role="log" aria-live="polite">
        <p className="chat-safety">
          <InfoIcon size={16} /> Giao dịch ngoài sàn không được Baby Things bảo vệ. Hãy trao đổi và thanh toán ngay trên website.
        </p>
        {conversation.messages.length === 0 && <p className="muted text-center">Hãy hỏi người bán về tình trạng, kích thước hoặc cách giao hàng.</p>}
        {conversation.messages.map((m) => (
          <div key={m.id} className={`bubble-row ${m.mine ? 'is-me' : 'is-peer'}`}>
            <div className="bubble">
              {m.images?.length > 0 && (
                <div className="bubble-images">
                  {m.images.map((src) => (
                    <img key={src} src={src} alt="Ảnh đã gửi" />
                  ))}
                </div>
              )}
              {m.text && <p>{m.text}</p>}
              <small>{timeAgo(m.at)}</small>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {conversation.blockedByPeer ? (
        <div className="chat-blocked">Bạn không thể nhắn tin cho {conversation.peer.name} nữa.</div>
      ) : blocked ? (
        <div className="chat-blocked">Bạn đã chặn {conversation.peer.name}. Bỏ chặn để tiếp tục nhắn tin.</div>
      ) : (
        <form className="chat-composer" onSubmit={submit}>
          {warn && (
            <div className="alert alert-warning" role="alert">
              Tin nhắn có vẻ chứa số điện thoại, số tài khoản hoặc link mạng xã hội. Giao dịch ngoài sàn không được bảo vệ.
            </div>
          )}
          {error && <div className="alert alert-error">{error}</div>}
          {images.length > 0 && (
            <div className="composer-previews">
              {images.map((img) => (
                <span key={img.url} className="composer-thumb">
                  <img src={img.url} alt={img.name} />
                  <button type="button" aria-label="Bỏ ảnh" onClick={() => setImages((l) => l.filter((i) => i !== img))}>
                    <XIcon size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="composer-row">
            <input ref={fileRef} type="file" accept="image/*" multiple className="visually-hidden" onChange={pickImages} />
            <button type="button" className="icon-btn" aria-label="Đính kèm ảnh" onClick={() => fileRef.current?.click()}>
              <CameraIcon size={22} />
            </button>
            <textarea
              rows={1}
              maxLength={MAX_TEXT}
              value={text}
              placeholder="Nhập tin nhắn…"
              aria-label="Nội dung tin nhắn"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) submit(e);
              }}
            />
            <button type="submit" className="btn btn-accent" disabled={sending || (!text.trim() && images.length === 0)}>
              Gửi
            </button>
          </div>
          <small className="muted composer-count">
            {text.length}/{MAX_TEXT}
          </small>
        </form>
      )}
    </div>
  );
}

/** Tải riêng hội thoại đang mở (kèm tin nhắn) rồi hiển thị khung chat. */
function ActiveThread({ id, onBack, onBlock, onReport }) {
  const { conversation, error, send } = useThread(id);
  if (error && !conversation) {
    return (
      <div className="chat-empty">
        <strong>Không mở được hội thoại</strong>
        <p className="muted">{error}</p>
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Về danh sách
        </button>
      </div>
    );
  }
  if (!conversation) return <div className="chat-empty muted">Đang tải…</div>;
  return <Thread key={conversation.id} conversation={conversation} onBack={onBack} onSend={send} onBlock={onBlock} onReport={onReport} />;
}

/** Hộp thư hai cột (FR-MSG-01..07). Trên điện thoại hiển thị lần lượt danh sách rồi hội thoại. */
export default function MessagesPage() {
  const { user } = useAuth();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { conversations, loading, setBlocked, report } = useMessages(user.id);

  return (
    <div className={`chat-shell${conversationId ? ' has-active' : ''}`}>
      <ConversationList conversations={conversations} loading={loading} activeId={conversationId} onSelect={(id) => navigate(`/messages/${id}`)} />
      {conversationId ? (
        <ActiveThread
          key={conversationId}
          id={conversationId}
          onBack={() => navigate('/messages')}
          onBlock={(blocked) => setBlocked(conversationId, blocked)}
          onReport={() => report(conversationId)}
        />
      ) : (
        <div className="chat-empty">
          <span className="empty-icon">
            <MessageIcon size={30} />
          </span>
          <strong>Chọn một hội thoại</strong>
          <p className="muted">Hỏi người bán về tình trạng sản phẩm ngay trên Baby Things — tin nhắn cũng là bằng chứng khi cần khiếu nại.</p>
        </div>
      )}
    </div>
  );
}
