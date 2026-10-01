import { useState, type FormEvent } from 'react';
import type { AuthUser } from '../api/client';
import type { Achievement, GameState, Species } from '../api/types';
import { NICKNAME_CHANGE_COST, formatNumber, getLevelProgress, getPopulationCount } from '../utils/gameCalc';

const PROFILE_MESSAGE_MAX_LENGTH = 60;

export function ProfileModal({
  user,
  gameState,
  species,
  achievements,
  diamonds,
  onClose,
  onSetNickname,
  onSetProfileMessage,
}: {
  user: AuthUser;
  gameState: GameState;
  species: Species[];
  achievements: Achievement[];
  diamonds: number;
  onClose: () => void;
  onSetNickname: (nickname: string) => void;
  onSetProfileMessage: (message: string) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(user.displayName);
  const [editingMessage, setEditingMessage] = useState(false);
  const [messageDraft, setMessageDraft] = useState(user.profileMessage ?? '');

  const canAffordNickname = diamonds >= NICKNAME_CHANGE_COST;
  const { level, currentXp, requiredXp } = getLevelProgress(gameState.xp);
  const totalPopulation = gameState.terrariums.reduce(
    (sum, t) => sum + getPopulationCount(t.population),
    0,
  );
  const collectionPercent = species.length
    ? Math.round((gameState.discovered.length / species.length) * 100)
    : 0;
  const joinedAt = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('ko-KR')
    : null;

  const startEditingName = () => {
    setNameDraft(user.displayName);
    setEditingName(true);
  };
  const submitName = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== user.displayName) onSetNickname(trimmed);
    setEditingName(false);
  };

  const startEditingMessage = () => {
    setMessageDraft(user.profileMessage ?? '');
    setEditingMessage(true);
  };
  const submitMessage = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = messageDraft.trim();
    if (trimmed !== (user.profileMessage ?? '')) onSetProfileMessage(trimmed);
    setEditingMessage(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="프로필 닫기">
          ×
        </button>

        <div className="profile-header">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="profile-avatar" />
          ) : (
            <span className="profile-avatar profile-avatar-fallback">
              {user.displayName.slice(0, 1)}
            </span>
          )}
          {editingName ? (
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
              <h2>{user.displayName}</h2>
              <button
                className="nickname-edit-button"
                onClick={startEditingName}
                title={`닉네임 변경 (💎 ${formatNumber(NICKNAME_CHANGE_COST)})`}
              >
                ✏️
              </button>
            </div>
          )}
        </div>

        {editingMessage ? (
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
        ) : (
          <button className="profile-message-button" onClick={startEditingMessage}>
            <p className={`profile-message${user.profileMessage ? '' : ' placeholder'}`}>
              {user.profileMessage || '소개 메시지를 적어보세요'}
            </p>
            <span>✏️</span>
          </button>
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
            <strong>{formatNumber(totalPopulation)}</strong>
            <span>보유 등각류</span>
          </div>
          <div className="profile-stat">
            <strong>{collectionPercent}%</strong>
            <span>도감 완성</span>
          </div>
          <div className="profile-stat">
            <strong>{formatNumber(gameState.pvpRating)}</strong>
            <span>투기장 레이팅</span>
          </div>
          <div className="profile-stat">
            <strong>
              {gameState.stats.battlesWon}승 {gameState.stats.battlesLost}패
            </strong>
            <span>야생 배틀</span>
          </div>
          <div className="profile-stat">
            <strong>
              {gameState.stats.pvpWins}승 {gameState.stats.pvpLosses}패
            </strong>
            <span>투기장 전적</span>
          </div>
          <div className="profile-stat">
            <strong>
              {gameState.achievementsClaimed.length}/{achievements.length}
            </strong>
            <span>업적 달성</span>
          </div>
        </div>

        {joinedAt && <p className="footnote profile-joined">가입일: {joinedAt}</p>}
      </div>
    </div>
  );
}
