import type { Achievement, GameState, Species } from '../api/types';
import { RARITIES, formatNumber, getAchievementProgress } from '../utils/gameCalc';

const ICONS: Record<string, string> = {
  heart: '❤️',
  coins: '🪙',
  search: '🔍',
  sprout: '🌱',
  expand: '📐',
  leaf: '🌿',
  book: '📖',
  trophy: '🏆',
};

export function AchievementsView({
  gameState,
  species,
  achievements,
  onClaim,
}: {
  gameState: GameState;
  species: Species[];
  achievements: Achievement[];
  onClaim: (achievementId: string) => void;
}) {
  const claimedCount = gameState.achievementsClaimed.length;

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">GROVE HALL OF FAME</p>
          <h1>
            업적 <span>{claimedCount} / {achievements.length}</span>
          </h1>
          <p className="subheading">돌보고, 모으고, 넓혀 온 시간이 쌓여 업적이 돼요.</p>
        </div>
      </div>

      <div className="achievement-grid">
        {achievements.map((a) => {
          const claimed = gameState.achievementsClaimed.includes(a.achievementId);
          const { progress, target } = getAchievementProgress(a, gameState, species);
          const complete = progress >= target && target > 0;
          const ratio = target > 0 ? Math.min(1, progress / target) : 0;
          return (
            <article
              className={`achievement-card${claimed ? ' claimed' : ''}`}
              key={a.achievementId}
            >
              <span className="achievement-icon">{ICONS[a.icon] ?? '🏆'}</span>
              {a.type === 'collectionRarity' && a.rarity !== undefined && (
                <span className="pill" style={{ color: RARITIES[a.rarity].color }}>
                  {RARITIES[a.rarity].name}
                </span>
              )}
              <h3>{a.label}</h3>
              <p>{a.description}</p>
              <div className="quest-progress">
                <i style={{ width: `${ratio * 100}%` }} />
              </div>
              <div className="achievement-footer">
                <span>{Math.min(progress, target)}/{target}</span>
                {claimed ? (
                  <span className="achievement-done">받음 ✓</span>
                ) : (
                  <button
                    className="claim-button"
                    disabled={!complete}
                    onClick={() => onClaim(a.achievementId)}
                  >
                    {complete ? '받기' : '보상'} · {formatNumber(a.reward)} G
                    {a.ticketReward ? ` · 🎟️${a.ticketReward}` : ''}
                    {a.diamondReward ? ` · 💎${a.diamondReward}` : ''}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
