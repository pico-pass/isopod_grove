import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import type { ChatMessage } from '../api/types';

const POLL_MS = 4000;
const MAX_LENGTH = 300;

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export function ChatWidget({ currentUserId }: { currentUserId: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [unread, setUnread] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openRef = useRef(open);
  const lastIdRef = useRef<string | undefined>(undefined);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // 최초 진입 시 최근 메시지를 불러오고, 이후 짧은 주기로 새 메시지만 이어받는다.
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const fresh = await api.getChatMessages(lastIdRef.current);
        if (cancelled || fresh.length === 0) return;
        lastIdRef.current = fresh[fresh.length - 1].id;
        setMessages((prev) => [...prev, ...fresh].slice(-200));
        if (!openRef.current) setUnread((n) => n + fresh.length);
      } catch {
        // 다음 주기에 재시도
      }
    };

    Promise.resolve().then(poll);
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // 새 메시지가 오거나 패널을 열면 맨 아래로 스크롤한다(DOM만 만지고 setState는 하지 않는다).
  useEffect(() => {
    if (open) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    }
  }, [open, messages]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const sent = await api.sendChatMessage(text);
      lastIdRef.current = sent.id;
      setMessages((prev) => [...prev, sent].slice(-200));
      setDraft('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '전송에 실패했어요.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <span>💬 공동 채팅방</span>
            <button className="chat-close" onClick={() => setOpen(false)} aria-label="채팅 닫기">
              ×
            </button>
          </div>
          <div className="chat-messages" ref={listRef}>
            {messages.length === 0 && <p className="empty">아직 대화가 없어요. 첫 인사를 건네보세요!</p>}
            {messages.map((m) => (
              <div className={`chat-message${m.userId === currentUserId ? ' me' : ''}`} key={m.id}>
                {m.avatarUrl ? (
                  <img src={m.avatarUrl} alt="" className="chat-avatar" />
                ) : (
                  <span className="chat-avatar chat-avatar-fallback">{m.displayName.slice(0, 1)}</span>
                )}
                <div className="chat-bubble">
                  <div className="chat-meta">
                    <span className="chat-name">{m.displayName}</span>
                    <span className="chat-time">{formatTime(m.createdAt)}</span>
                  </div>
                  <p>{m.text}</p>
                </div>
              </div>
            ))}
          </div>
          {error && <p className="chat-error">{error}</p>}
          <form className="chat-input-row" onSubmit={submit}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={MAX_LENGTH}
              placeholder="메시지를 입력하세요"
            />
            <button type="submit" className="button primary" disabled={sending || !draft.trim()}>
              전송
            </button>
          </form>
        </div>
      )}
      <button
        className="chat-toggle"
        onClick={() =>
          setOpen((v) => {
            const next = !v;
            if (next) setUnread(0);
            return next;
          })
        }
      >
        💬
        {!open && unread > 0 && <span className="chat-unread">{unread > 99 ? '99+' : unread}</span>}
      </button>
    </div>
  );
}
