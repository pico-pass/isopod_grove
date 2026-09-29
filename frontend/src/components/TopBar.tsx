import { useState, type FormEvent } from 'react';
import type { AuthUser } from '../api/client';
import { NICKNAME_CHANGE_COST, formatNumber } from '../utils/gameCalc';

export function TopBar({
  coins,
  explorationTickets,
  diamonds,
  user,
  onLogout,
  onSetNickname,
  onToggleSidebar,
}: {
  coins: number;
  explorationTickets: number;
  diamonds: number;
  user: AuthUser;
  onLogout: () => void;
  onSetNickname: (nickname: string) => void;
  onToggleSidebar: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(user.displayName);
  const canAfford = diamonds >= NICKNAME_CHANGE_COST;

  const startEditing = () => {
    setDraft(user.displayName);
    setEditing(true);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || trimmed === user.displayName) {
      setEditing(false);
      return;
    }
    onSetNickname(trimmed);
    setEditing(false);
  };

  return (
    <header className="topbar">
      <div className="brand">
        <button className="sidebar-toggle" onClick={onToggleSidebar} aria-label="메뉴 열기">
          ☰
        </button>
        <span className="brand-mark">🐛</span>
        <span>
          ISOPOD <b>GROVE</b>
          <small>등각류 키우기 타이쿤</small>
        </span>
      </div>
      <div className="topbar-right">
        <div className="wallet">
          <span className="coin">G</span>
          <strong>{formatNumber(coins)}</strong>
          <span className="wallet-label">골드</span>
        </div>
        <div className="wallet ticket-wallet">
          <span className="coin">🎟️</span>
          <strong>{formatNumber(explorationTickets)}</strong>
          <span className="wallet-label">탐색권</span>
        </div>
        <div className="wallet diamond-wallet">
          <span className="coin">💎</span>
          <strong>{formatNumber(diamonds)}</strong>
          <span className="wallet-label">다이아</span>
        </div>
        <div className="user-chip">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="user-avatar" />
          ) : (
            <span className="user-avatar-fallback">{user.displayName.slice(0, 1)}</span>
          )}
          {editing ? (
            <form className="nickname-form" onSubmit={submit}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={12}
                autoFocus
                onBlur={() => setEditing(false)}
              />
              <button
                type="submit"
                className="nickname-submit"
                disabled={!canAfford}
                onMouseDown={(e) => e.preventDefault()}
                title={canAfford ? undefined : `다이아가 부족해요 (필요 ${NICKNAME_CHANGE_COST})`}
              >
                변경 · 💎{formatNumber(NICKNAME_CHANGE_COST)}
              </button>
            </form>
          ) : (
            <>
              <span className="user-name">{user.displayName}</span>
              <button
                className="nickname-edit-button"
                onClick={startEditing}
                title={`닉네임 변경 (💎 ${formatNumber(NICKNAME_CHANGE_COST)})`}
              >
                ✏️
              </button>
            </>
          )}
          <button className="logout-button" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
