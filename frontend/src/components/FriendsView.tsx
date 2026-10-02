import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import type { Friend, FriendRequest, FriendSearchResult } from '../api/types';
import { FriendChatModal } from './FriendChatModal';
import { PushToggle } from './PushToggle';

function Avatar({ name, url }: { name: string; url?: string }) {
  return url ? (
    <img src={url} alt="" className="ranking-avatar" />
  ) : (
    <span className="ranking-avatar ranking-avatar-fallback">{name.slice(0, 1)}</span>
  );
}

// 친구 아바타 위에 접속 여부 점을 얹는다.
function PresenceAvatar({ name, url, online }: { name: string; url?: string; online: boolean }) {
  return (
    <span className="presence-wrap">
      <Avatar name={name} url={url} />
      <i className={`presence-dot${online ? ' on' : ''}`} title={online ? '접속 중' : '접속 안 함'} />
    </span>
  );
}

export function FriendsView({
  currentUserId,
  unreadByFriend,
  onUnreadChanged,
  showToast,
  onOpenProfile,
}: {
  currentUserId: string;
  unreadByFriend: Record<string, number>;
  onUnreadChanged: () => void;
  showToast: (message: string, isError?: boolean) => void;
  onOpenProfile: (userId: string) => void;
}) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FriendSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [chatWith, setChatWith] = useState<Friend | null>(null);

  // silent: 주기적인 새로고침(접속 표시 갱신)은 실패해도 알림을 띄우지 않는다.
  const load = useCallback(
    async (silent = false) => {
      try {
        const r = await api.getFriends();
        setFriends(r.friends);
        setIncoming(r.incomingRequests);
        setOutgoing(r.outgoingRequests);
      } catch (e) {
        if (!silent) showToast(e instanceof Error ? e.message : '친구 목록을 불러오지 못했어요.', true);
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    Promise.resolve().then(() => load());
    // 친구의 접속 표시와 새 친구(수락된 요청)를 주기적으로 맞춘다.
    const id = setInterval(() => void load(true), 20_000);
    return () => clearInterval(id);
  }, [load]);

  const search = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || searching) return;
    setSearching(true);
    try {
      setResults(await api.searchFriends(trimmed));
    } catch (e) {
      showToast(e instanceof Error ? e.message : '검색에 실패했어요.', true);
    } finally {
      setSearching(false);
    }
  };

  const withBusy = async (id: string, fn: () => Promise<{ message: string }>) => {
    if (busyId) return;
    setBusyId(id);
    try {
      const r = await fn();
      showToast(r.message);
      setResults((prev) => prev.filter((u) => u.userId !== id));
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : '문제가 발생했어요.', true);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">FOREST FRIENDS</p>
          <h1>친구</h1>
          <p className="subheading">
            친구를 맺으면 하루 한 번씩 서로에게 💎 다이아를 선물하고, 1:1로 채팅할 수 있어요. 내 다이아는 줄지 않아요!
          </p>
        </div>
      </div>

      <PushToggle showToast={showToast} />

      <p className="nav-caption">친구 추가</p>
      <form className="friend-search-row" onSubmit={search}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="닉네임으로 검색"
          maxLength={20}
        />
        <button type="submit" className="button primary" disabled={searching || !query.trim()}>
          {searching ? '검색 중...' : '검색'}
        </button>
      </form>
      {results.length > 0 && (
        <div className="ranking-list friend-section">
          {results.map((u) => (
            <div className="ranking-row" key={u.userId}>
              <button className="friend-identity" onClick={() => onOpenProfile(u.userId)}>
                <Avatar name={u.displayName} url={u.avatarUrl} />
                <span className="ranking-name">{u.displayName}</span>
              </button>
              <button
                className="button secondary"
                disabled={busyId === u.userId}
                onClick={() => withBusy(u.userId, () => api.sendFriendRequest(u.userId))}
              >
                + 친구 요청
              </button>
            </div>
          ))}
        </div>
      )}

      {incoming.length > 0 && (
        <>
          <p className="nav-caption">받은 요청</p>
          <div className="ranking-list friend-section">
            {incoming.map((r) => (
              <div className="ranking-row" key={r.requestId}>
                <button className="friend-identity" onClick={() => onOpenProfile(r.userId)}>
                  <Avatar name={r.displayName} url={r.avatarUrl} />
                  <span className="ranking-name">{r.displayName}</span>
                </button>
                <div className="friend-actions">
                  <button
                    className="button primary"
                    disabled={busyId === r.requestId}
                    onClick={() => withBusy(r.requestId, () => api.acceptFriendRequest(r.requestId))}
                  >
                    수락
                  </button>
                  <button
                    className="button secondary"
                    disabled={busyId === r.requestId}
                    onClick={() => withBusy(r.requestId, () => api.declineFriendRequest(r.requestId))}
                  >
                    거절
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {outgoing.length > 0 && (
        <>
          <p className="nav-caption">보낸 요청</p>
          <div className="ranking-list friend-section">
            {outgoing.map((r) => (
              <div className="ranking-row" key={r.requestId}>
                <button className="friend-identity" onClick={() => onOpenProfile(r.userId)}>
                  <Avatar name={r.displayName} url={r.avatarUrl} />
                  <span className="ranking-name">{r.displayName} · 응답 대기 중</span>
                </button>
                <button
                  className="button secondary"
                  disabled={busyId === r.requestId}
                  onClick={() => withBusy(r.requestId, () => api.declineFriendRequest(r.requestId))}
                >
                  취소
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="nav-caption">내 친구 {friends.length > 0 ? `(${friends.length})` : ''}</p>
      {loading ? (
        <p className="empty">불러오는 중이에요...</p>
      ) : friends.length === 0 ? (
        <p className="empty">아직 친구가 없어요. 위에서 닉네임으로 검색해 친구를 맺어 보세요!</p>
      ) : (
        <div className="ranking-list friend-section">
          {friends.map((f) => (
            <div className="ranking-row" key={f.userId}>
              <button className="friend-identity" onClick={() => onOpenProfile(f.userId)}>
                <PresenceAvatar name={f.displayName} url={f.avatarUrl} online={f.online} />
                <span className="ranking-name">
                  {f.displayName}
                  {f.online && <small className="presence-text on"> 접속 중</small>}
                </span>
              </button>
              <div className="friend-actions">
                <button className="button secondary friend-chat-button" onClick={() => setChatWith(f)}>
                  💬 채팅
                  {(unreadByFriend[f.userId] ?? 0) > 0 && (
                    <span className="friend-unread">{unreadByFriend[f.userId]}</span>
                  )}
                </button>
                <button
                  className="button primary"
                  disabled={!f.canGiftToday || busyId === f.userId}
                  onClick={() => withBusy(f.userId, () => api.giftFriend(f.userId))}
                >
                  {f.canGiftToday ? '🎁 선물하기' : '오늘 선물 완료'}
                </button>
                <button
                  className="button secondary"
                  disabled={busyId === f.userId}
                  onClick={() => withBusy(f.userId, () => api.removeFriend(f.userId))}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {chatWith && (
        <FriendChatModal
          friend={chatWith}
          currentUserId={currentUserId}
          onClose={() => {
            setChatWith(null);
            onUnreadChanged();
          }}
          onRead={onUnreadChanged}
          onOpenProfile={onOpenProfile}
          showToast={showToast}
        />
      )}
    </section>
  );
}
