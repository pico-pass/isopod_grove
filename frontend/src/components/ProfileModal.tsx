import { useEffect, useState, type FormEvent } from 'react';
import { api, type AuthUser } from '../api/client';
import type { GameState, NotificationPrefs, PublicProfile, Species } from '../api/types';
import { NotificationSettings } from './NotificationSettings';
import { NICKNAME_CHANGE_COST, formatNumber, getLevelProgress, getPopulationCount } from '../utils/gameCalc';

const PROFILE_MESSAGE_MAX_LENGTH = 60;

export function ProfileModal({
  targetUserId,
  currentUser,
  gameState,
  species,
  achievementsTotal,
  diamonds,
  onClose,
  onSetNickname,
  onSetProfileMessage,
  notificationPrefs,
  onUpdateNotificationPrefs,
  showToast,
}: {
  targetUserId: string;
  currentUser: AuthUser;
  gameState: GameState;
  species: Species[];
  achievementsTotal: number;
  diamonds: number;
  onClose: () => void;
  onSetNickname: (nickname: string) => void;
  onSetProfileMessage: (message: string) => void;
  notificationPrefs: NotificationPrefs;
  onUpdateNotificationPrefs: (patch: Partial<NotificationPrefs>) => void;
  showToast: (message: string, isError?: boolean) => void;
}) {
  const isSelf = targetUserId === currentUser._id;
  const [other, setOther] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(!isSelf);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(currentUser.displayName);
  const [editingMessage, setEditingMessage] = useState(false);
  const [messageDraft, setMessageDraft] = useState(currentUser.profileMessage ?? '');

  useEffect(() => {
    if (isSelf) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const p = await api.getPublicProfile(targetUserId);
        if (!cancelled) setOther(p);
      } catch (e) {
        if (!cancelled) showToast(e instanceof Error ? e.message : '프로필을 불러오지 못했어요.', true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    Promise.resolve().then(run);
    return () => {
      cancelled = true;
    };
  }, [targetUserId, isSelf, showToast]);

  const data: PublicProfile | null = isSelf
    ? {
        userId: currentUser._id,
        displayName: currentUser.displayName,
        avatarUrl: currentUser.avatarUrl,
        profileMessage: currentUser.profileMessage,
        createdAt: currentUser.createdAt,
        xp: gameState.xp,
        pvpRating: gameState.pvpRating,
        discoveredCount: gameState.discovered.length,
        totalPopulation: gameState.terrariums.reduce(
          (sum, t) => sum + getPopulationCount(t.population),
          0,
        ),
        achievementsClaimedCount: gameState.achievementsClaimed.length,
        stats: gameState.stats,
      }
    : other;

  const startEditingName = () => {
    setNameDraft(currentUser.displayName);
    setEditingName(true);
  };
  const submitName = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== currentUser.displayName) onSetNickname(trimmed);
    setEditingName(false);
  };

  const startEditingMessage = () => {
    setMessageDraft(currentUser.profileMessage ?? '');
    setEditingMessage(true);
  };
  const submitMessage = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = messageDraft.trim();
    if (trimmed !== (currentUser.profileMessage ?? '')) onSetProfileMessage(trimmed);
    setEditingMessage(false);
  };

  if (!data) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card profile-modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose} aria-label="프로필 닫기">
            ×
          </button>
          <p className="empty">{loading ? '불러오는 중이에요...' : '프로필을 찾을 수 없어요.'}</p>
        </div>
      </div>
    );
  }

  const canAffordNickname = diamonds >= NICKNAME_CHANGE_COST;
  const { level, currentXp, requiredXp } = getLevelProgress(data.xp);
  const collectionPercent = species.length
    ? Math.round((data.discoveredCount / species.length) * 100)
    : 0;
  const joinedAt = data.createdAt ? new Date(data.createdAt).toLocaleDateString('ko-KR') : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="프로필 닫기">
          ×
        </button>

        <div className="profile-header">
          {data.avatarUrl ? (
            <img src={data.avatarUrl} alt="" className="profile-avatar" />
          ) : (
            <span className="profile-avatar profile-avatar-fallback">
              {data.displayName.slice(0, 1)}
            </span>
          )}
          {isSelf && editingName ? (
            <form className="nickname-form" onSubmit={submitName}>
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={12}
                autoFocus
                onBlur={() => setEditingName(false)}
              />
              <button
                type="submit"
                className="nickname-submit"
                disabled={!canAffordNickname}
                onMouseDown={(e) => e.preventDefault()}
                title={canAffordNickname ? undefined : `다이아가 부족해요 (필요 ${NICKNAME_CHANGE_COST})`}
              >
                변경 · 💎{formatNumber(NICKNAME_CHANGE_COST)}
              </button>
            </form>
          ) : (
            <div className="profile-name-row">
              <h2>{data.displayName}</h2>
              {isSelf && (
                <button
                  className="nickname-edit-button"
                  onClick={startEditingName}
                  title={`닉네임 변경 (💎 ${formatNumber(NICKNAME_CHANGE_COST)})`}
                >
                  ✏️
                </button>
              )}
            </div>
          )}
        </div>

        {isSelf && editingMessage ? (
          <form className="nickname-form profile-message-form" onSubmit={submitMessage}>
            <input
              value={messageDraft}
              onChange={(e) => setMessageDraft(e.target.value)}
              maxLength={PROFILE_MESSAGE_MAX_LENGTH}
              autoFocus
              placeholder="소개 메시지를 적어보세요"
              onBlur={() => setEditingMessage(false)}
            />
            <button type="submit" className="nickname-submit" onMouseDown={(e) => e.preventDefault()}>
              완료
            </button>
          </form>
        ) : isSelf ? (
          <button className="profile-message-button" onClick={startEditingMessage}>
            <p className={`profile-message${data.profileMessage ? '' : ' placeholder'}`}>
              {data.profileMessage || '소개 메시지를 적어보세요'}
            </p>
            <span>✏️</span>
          </button>
        ) : (
          data.profileMessage && <p className="profile-message profile-message-readonly">{data.profileMessage}</p>
        )}

        <div className="xp-track">
          <i style={{ width: `${(currentXp / requiredXp) * 100}%` }} />
        </div>
        <div className="xp-label">
          <span>Lv. {level}</span>
          <span>
            {Math.floor(currentXp)} / {requiredXp}
          </span>
        </div>

        <div className="profile-stats-grid">
          <div className="profile-stat">
            <strong>{formatNumber(data.totalPopulation)}</strong>
            <span>보유 등각류</span>
          </div>
          <div className="profile-stat">
            <strong>{collectionPercent}%</strong>
            <span>도감 완성</span>
          </div>
          <div className="profile-stat">
            <strong>{formatNumber(data.pvpRating)}</strong>
            <span>투기장 레이팅</span>
          </div>
          <div className="profile-stat">
            <strong>
              {data.stats.battlesWon}승 {data.stats.battlesLost}패
            </strong>
            <span>야생 배틀</span>
          </div>
          <div className="profile-stat">
            <strong>
              {data.stats.pvpWins}승 {data.stats.pvpLosses}패
            </strong>
            <span>투기장 전적</span>
          </div>
          <div className="profile-stat">
            <strong>
              {data.achievementsClaimedCount}/{achievementsTotal}
            </strong>
            <span>업적 달성</span>
          </div>
        </div>

        {isSelf && (
          <NotificationSettings prefs={notificationPrefs} onChange={onUpdateNotificationPrefs} showToast={showToast} />
        )}

        {joinedAt && <p className="footnote profile-joined">가입일: {joinedAt}</p>}
      </div>
    </div>
  );
}
