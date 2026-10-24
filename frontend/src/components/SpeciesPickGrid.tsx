import type { GameState, Species, SpeciesFamily } from '../api/types';
import {
  applyStatBonuses,
  combineBonuses,
  getBattleLevelProgress,
  getCombatBaseStats,
  getFamilyMatchup,
  starBonuses,
  type StatBonuses,
} from '../utils/gameCalc';
import { FamilyBadge } from './FamilyBadge';
import { SpeciesImage } from './SpeciesImage';

export function SpeciesPickGrid({
  species,
  gameState,
  activeId,
  disabled,
  bonuses,
  familyRules,
  onPick,
}: {
  species: Species[];
  gameState: GameState;
  activeId: string;
  disabled: boolean;
  bonuses: StatBonuses;
  // 계열 상성이 적용되는 전투(보스 타워·야생 배틀)에서만 준다. 상대 계열을 알면 유리·불리를, 환경이 편드는 계열을 알면 환경 보너스를 표시한다.
  familyRules?: { enemy: SpeciesFamily | null; environment: SpeciesFamily | null };
  onPick: (speciesId: string) => void;
}) {
  return (
    <div className="battle-picker">
      {species.map((sp) => {
        const progress = getBattleLevelProgress(gameState.battleXp[sp.speciesId] || 0);
        const stars = gameState.battleStars?.[sp.speciesId] ?? 0;
        const stats = applyStatBonuses(getCombatBaseStats(sp.rarity, progress.level), combineBonuses(bonuses, starBonuses(stars)));
        return (
          <button
            key={sp.speciesId}
            className={`battle-pick${activeId === sp.speciesId ? ' active' : ''}`}
            onClick={() => onPick(sp.speciesId)}
            disabled={disabled}
          >
            <SpeciesImage species={sp} style={{ filter: sp.filter }} />
            <span className="battle-pick-name">
              {sp.name} <small className="battle-pick-level">Lv.{progress.level}</small>
              {stars > 0 && <small className="battle-pick-stars" title={`각성 ★${stars}`}> ★{stars}</small>}
            </span>
            <div className="mini-xp-bar">
              <i style={{ width: `${(progress.currentXp / progress.requiredXp) * 100}%` }} />
            </div>
            <small>
              ❤️{stats.hp} ⚔️{stats.atk} 🛡️{stats.def}
            </small>
            {familyRules && sp.family && (
              <small
                className={`battle-pick-family ${familyRules.enemy ? getFamilyMatchup(sp.family, familyRules.enemy) : ''}`}
              >
                <FamilyBadge family={sp.family} />
                {familyRules.environment === sp.family && ' · 환경 +3%'}
              </small>
            )}
          </button>
        );
      })}
    </div>
  );
}
