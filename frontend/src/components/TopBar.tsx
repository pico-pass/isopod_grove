import type { AuthUser } from '../api/client';
import { formatNumber } from '../utils/gameCalc';

export function TopBar({
  coins,
  user,
  onLogout,
}: {
  coins: number;
  user: AuthUser;
  onLogout: () => void;
}) {
  return (
    <header className="topbar">
      <div className="brand">
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
        <div className="user-chip">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="user-avatar" />
          ) : (
            <span className="user-avatar-fallback">{user.displayName.slice(0, 1)}</span>
          )}
          <span className="user-name">{user.displayName}</span>
          <button className="logout-button" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
