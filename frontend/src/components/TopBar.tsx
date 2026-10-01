import type { AuthUser } from '../api/client';
import { formatNumber } from '../utils/gameCalc';

export function TopBar({
  coins,
  explorationTickets,
  diamonds,
  user,
  onLogout,
  onOpenProfile,
  onToggleSidebar,
}: {
  coins: number;
  explorationTickets: number;
  diamonds: number;
  user: AuthUser;
  onLogout: () => void;
  onOpenProfile: () => void;
  onToggleSidebar: () => void;
}) {
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
        <button className="user-chip" onClick={onOpenProfile} title="프로필 보기">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="user-avatar" />
          ) : (
            <span className="user-avatar-fallback">{user.displayName.slice(0, 1)}</span>
          )}
          <span className="user-name">{user.displayName}</span>
        </button>
        <button className="logout-button" onClick={onLogout}>
          로그아웃
        </button>
      </div>
    </header>
  );
}
