import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import type { ChatChannel, ChatMessage, OnlinePlayer } from '../api/types';

const POLL_MS = 4000;
const MAX_LENGTH = 300;

const CHANNELS: { key: ChatChannel; label: string; icon: string }[] = [
  { key: 'free', label: '자유방', icon: '💬' },
  { key: 'question', label: '질문방', icon: '❓' },
  { key: 'inquiry', label: '문의방', icon: '📮' },
];

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export function ChatWidget({ currentUserId }: { currentUserId: string }) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<ChatChannel>('free');
  const [messagesByChannel, setMessagesByChannel] = useState<Record<ChatChannel, ChatMessage[]>>({
    free: [],
    question: [],
    inquiry: [],
  });
  const [draft, setDraft] = useState('');
  const [unread, setUnread] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [onlineOpen, setOnlineOpen] = useState(false);

  const openRef = useRef(open);
  const channelRef = useRef(channel);
  const lastIdByChannel = useRef<Record<ChatChannel, string | undefined>>({
    free: undefined,
    question: undefined,
    inquiry: undefined,
  });
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    channelRef.current = channel;
  }, [channel]);

  // 채널마다 최초 진입 시 최근 메시지를 불러오고, 이후 짧은 주기로 새 메시지만 이어받는다.
  // 세 채널을 한 번에 폴링해서 탭을 바꿀 때 다시 불러올 필요가 없게 한다.
  useEffect(() => {
    let cancelled = false;

    const pollChannel = async (ch: ChatChannel) => {
      try {
        const fresh = await api.getChatMessages(ch, lastIdByChannel.current[ch]);
        if (cancelled || fresh.length === 0) return;
        lastIdByChannel.current[ch] = fresh[fresh.length - 1].id;
        setMessagesByChannel((prev) => ({ ...prev, [ch]: [...prev[ch], ...fresh].slice(-200) }));
        if (!openRef.current || channelRef.current !== ch) setUnread((n) => n + fresh.length);
      } catch {
        // 다음 주기에 재시도
      }
    };

    const poll = async () => {
      await Promise.all(CHANNELS.map((c) => pollChannel(c.key)));
      try {
        const presence = await api.getOnlinePlayers();
        if (!cancelled) setOnlinePlayers(presence.players);
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

  // 새 메시지가 오거나 패널을 열거나 채널을 바꾸면 맨 아래로 스크롤한다(DOM만 만지고 setState는 하지 않는다).
  useEffect(() => {
    if (open) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    }
  }, [open, channel, messagesByChannel]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const sent = await api.sendChatMessage(channel, text);
      lastIdByChannel.current[channel] = sent.id;
      setMessagesByChannel((prev) => ({ ...prev, [channel]: [...prev[channel], sent].slice(-200) }));
      setDraft('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '전송에 실패했어요.');
    } finally {
      setSending(false);
    }
  };

  const messages = messagesByChannel[channel];
  const channelLabel = CHANNELS.find((c) => c.key === channel)?.label ?? '';

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
          <div className="filter-row chat-channel-row">
            {CHANNELS.map((c) => (
              <button
                key={c.key}
                className={`filter${channel === c.key ? ' active' : ''}`}
                onClick={() => setChannel(c.key)}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>
          <button className="online-toggle" onClick={() => setOnlineOpen((v) => !v)}>
            👥 접속 중 {onlinePlayers.length}명 {onlineOpen ? '▲' : '▼'}
          </button>
          {onlineOpen && (
            <div className="online-list">
              {onlinePlayers.length === 0 ? (
                <p className="empty">접속 중인 숲지기가 없어요.</p>
              ) : (
                onlinePlayers.map((p) => (
                  <div className={`online-row${p.userId === currentUserId ? ' me' : ''}`} key={p.userId}>
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt="" className="chat-avatar" />
                    ) : (
                      <span className="chat-avatar chat-avatar-fallback">{p.displayName.slice(0, 1)}</span>
                    )}
                    <span>{p.displayName}</span>
                  </div>
                ))
              )}
            </div>
          )}
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
              placeholder={`${channelLabel}에 메시지 보내기`}
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
