import type { GameState, Species } from '../api/types';
import {
  applyStatBonuses,
  getBattleLevelProgress,
  getCombatBaseStats,
  type StatBonuses,
} from '../utils/gameCalc';
import { SpeciesImage } from './SpeciesImage';

export function SpeciesPickGrid({
  species,
  gameState,
  activeId,
  disabled,
  bonuses,
  onPick,
}: {
  species: Species[];
  gameState: GameState;
  activeId: string;
  disabled: boolean;
  bonuses: StatBonuses;
  onPick: (speciesId: string) => void;
}) {
  return (
    <div className="battle-picker">
      {species.map((sp) => {
        const progress = getBattleLevelProgress(gameState.battleXp[sp.speciesId] || 0);
        const stats = applyStatBonuses(getCombatBaseStats(sp.rarity, progress.level), bonuses);
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
            </span>
            <div className="mini-xp-bar">
              <i style={{ width: `${(progress.currentXp / progress.requiredXp) * 100}%` }} />
            </div>
            <small>
              ❤️{stats.hp} ⚔️{stats.atk} 🛡️{stats.def}
            </small>
          </button>
        );
      })}
    </div>
  );
}
