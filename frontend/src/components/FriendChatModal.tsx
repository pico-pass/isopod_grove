import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import type { ChatReportReason, Friend, FriendChatMessage } from '../api/types';

const POLL_MS = 3000;
const MAX_LENGTH = 300;
const REPORT_DETAIL_MAX = 200;

const REPORT_REASONS: { key: ChatReportReason; label: string }[] = [
  { key: 'abuse', label: '욕설·비방' },
  { key: 'spam', label: '도배·광고' },
  { key: 'inappropriate', label: '불쾌하거나 부적절한 내용' },
  { key: 'other', label: '기타' },
];

const formatTime = (at: number) =>
  new Date(at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

const formatDay = (at: number) =>
  new Date(at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

// 같은 id가 두 번 들어오지 않게 합친다(보낸 직후 목록에 넣은 내 메시지가 폴링으로 또 오는 경우가 있다).
const appendUnique = (list: FriendChatMessage[], fresh: FriendChatMessage[]) => {
  const seen = new Set(list.map((m) => m.id));
  const added = fresh.filter((m) => !seen.has(m.id));
  return added.length ? [...list, ...added].slice(-300) : list;
};

const withId = (set: Set<string>, id: string) => new Set(set).add(id);

export function FriendChatModal({
  friend,
  currentUserId,
  onClose,
  onRead,
  onOpenProfile,
  showToast,
}: {
  friend: Friend;
  currentUserId: string;
  onClose: () => void;
  // 대화창에서 상대 메시지를 가져와 읽음 처리됐을 때(안 읽은 수를 다시 불러오라는 신호)
  onRead: () => void;
  onOpenProfile: (userId: string) => void;
  showToast: (message: string, isError?: boolean) => void;
}) {
  const [messages, setMessages] = useState<FriendChatMessage[]>([]);
  // 서버가 폴링마다 내려주는 "지금 상태": 내가 보낸 것 중 상대가 아직 안 읽은 메시지, 삭제된 메시지, 상대의 접속 여부
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [online, setOnline] = useState(friend.online);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<FriendChatMessage | null>(null);
  const [reportReason, setReportReason] = useState<ChatReportReason>('abuse');
  const [reportDetail, setReportDetail] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const lastIdRef = useRef<string | undefined>(undefined);
  const listRef = useRef<HTMLDivElement>(null);

  // 처음에 최근 대화를 불러오고, 이후에는 짧은 주기로 새 메시지와 읽음·삭제·접속 상태를 이어받는다.
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await api.getFriendMessages(friend.userId, lastIdRef.current);
        if (cancelled) return;
        setError(null);
        setUnreadIds(new Set(r.friendUnreadIds));
        setDeletedIds(new Set(r.deletedIds));
        setOnline(r.friendOnline);
        if (r.messages.length > 0) {
          lastIdRef.current = r.messages[r.messages.length - 1].id;
          setMessages((prev) => appendUnique(prev, r.messages));
          if (r.messages.some((m) => m.userId === friend.userId)) onRead();
        }
      } catch (e) {
        // 친구 관계가 끊기는 등 서버가 거부하면 그 이유를 보여주고, 일시적인 오류는 다음 주기에 다시 시도한다.
        if (!cancelled && e instanceof Error) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    Promise.resolve().then(poll);
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [friend.userId, onRead]);

  // 새 메시지가 오면 맨 아래로 스크롤한다(DOM만 만지고 setState는 하지 않는다).
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // 신고 창이 열려 있으면 그것만 닫는다.
      if (reportTarget) setReportTarget(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, reportTarget]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const sent = await api.sendFriendMessage(friend.userId, text);
      lastIdRef.current = sent.id;
      setMessages((prev) => appendUnique(prev, [sent]));
      // 방금 보낸 메시지는 상대가 아직 안 읽은 상태다(다음 폴링 전에 "읽음"으로 잘못 보이지 않게).
      setUnreadIds((prev) => withId(prev, sent.id));
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '전송에 실패했어요.');
    } finally {
      setSending(false);
    }
  };

  const remove = async (m: FriendChatMessage) => {
    if (!window.confirm('이 메시지를 삭제할까요?\n상대방 화면에서도 "삭제된 메시지"로 바뀌어요.')) return;
    try {
      await api.deleteFriendMessage(friend.userId, m.id);
      setDeletedIds((prev) => withId(prev, m.id));
      setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제하지 못했어요.');
    }
  };

  const openReport = (m: FriendChatMessage) => {
    setReportTarget(m);
    setReportReason('abuse');
    setReportDetail('');
    setReportError(null);
    setSelectedId(null);
  };

  const submitReport = async () => {
    if (!reportTarget || reporting) return;
    setReporting(true);
    setReportError(null);
    try {
      const r = await api.reportFriendMessage(reportTarget.id, reportReason, reportDetail.trim());
      showToast(r.message);
      setReportTarget(null);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : '신고하지 못했어요.');
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card friend-chat-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="채팅 닫기">
          ×
        </button>
        <button className="friend-chat-header" onClick={() => onOpenProfile(friend.userId)} title="프로필 보기">
          <span className="presence-wrap">
            {friend.avatarUrl ? (
              <img src={friend.avatarUrl} alt="" className="ranking-avatar" />
            ) : (
              <span className="ranking-avatar ranking-avatar-fallback">{friend.displayName.slice(0, 1)}</span>
            )}
            <i className={`presence-dot${online ? ' on' : ''}`} />
          </span>
          <span className="friend-chat-title">
            <strong>{friend.displayName}</strong>
            <small className={online ? 'presence-text on' : 'presence-text'}>{online ? '접속 중' : '접속 안 함'}</small>
          </span>
        </button>

        <div className="chat-messages friend-chat-messages" ref={listRef}>
          {loading && <p className="empty">대화를 불러오는 중이에요...</p>}
          {!loading && messages.length === 0 && <p className="empty">아직 대화가 없어요. 먼저 인사를 건네보세요!</p>}
          {messages.map((m, i) => {
            const newDay = i === 0 || formatDay(messages[i - 1].createdAt) !== formatDay(m.createdAt);
            const mine = m.userId === currentUserId;
            const deleted = m.deleted || deletedIds.has(m.id);
            const selected = selectedId === m.id && !deleted;
            return (
              <div key={m.id} className="friend-chat-item">
                {newDay && <div className="friend-chat-day">{formatDay(m.createdAt)}</div>}
                <div className={`chat-message${mine ? ' me' : ''}`}>
                  <div className="chat-bubble-wrap">
                    {deleted ? (
                      <div className="chat-bubble deleted">
                        <p>삭제된 메시지입니다.</p>
                      </div>
                    ) : (
                      <button
                        className="chat-bubble chat-bubble-button"
                        onClick={() => setSelectedId((cur) => (cur === m.id ? null : m.id))}
                        aria-expanded={selected}
                      >
                        <p>{m.text}</p>
                      </button>
                    )}
                    <div className="chat-meta">
                      {mine && !deleted && !unreadIds.has(m.id) && <span className="chat-read">읽음</span>}
                      <span className="chat-time">{formatTime(m.createdAt)}</span>
                    </div>
                    {selected && (
                      <div className="chat-actions">
                        {mine ? (
                          <button onClick={() => void remove(m)}>🗑 삭제</button>
                        ) : (
                          <button onClick={() => openReport(m)}>🚩 신고</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {reportTarget && (
          <div className="report-panel" role="dialog" aria-label="메시지 신고">
            <strong>🚩 메시지 신고</strong>
            <p className="report-preview">“{reportTarget.text}”</p>
            <div className="report-reasons">
              {REPORT_REASONS.map((r) => (
                <label key={r.key}>
                  <input
                    type="radio"
                    name="report-reason"
                    checked={reportReason === r.key}
                    onChange={() => setReportReason(r.key)}
                  />
                  {r.label}
                </label>
              ))}
            </div>
            <textarea
              value={reportDetail}
              maxLength={REPORT_DETAIL_MAX}
              rows={2}
              placeholder="자세한 내용을 적어 주세요(선택)"
              onChange={(e) => setReportDetail(e.target.value)}
            />
            <small className="report-note">
              신고하면 이 메시지와 앞뒤 대화가 운영자에게 전달돼요. 허위 신고는 제한될 수 있어요.
            </small>
            {reportError && <p className="chat-error">{reportError}</p>}
            <div className="report-actions">
              <button className="button secondary" onClick={() => setReportTarget(null)} disabled={reporting}>
                취소
              </button>
              <button className="button primary" onClick={() => void submitReport()} disabled={reporting}>
                {reporting ? '신고하는 중...' : '신고하기'}
              </button>
            </div>
          </div>
        )}

        {error && <p className="chat-error">{error}</p>}
        <form className="chat-input-row" onSubmit={submit}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={MAX_LENGTH}
            placeholder={`${friend.displayName}님에게 메시지 보내기`}
            autoFocus
          />
          <button type="submit" className="button primary" disabled={sending || !draft.trim()}>
            전송
          </button>
        </form>
      </div>
    </div>
  );
}
