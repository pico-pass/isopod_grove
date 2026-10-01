import type { CombatStats } from '../api/types';
import { RARITIES } from '../utils/gameCalc';
import { SpeciesImage } from './SpeciesImage';

export interface Fighter {
  speciesId: string;
  name: string;
  image?: string;
  filter: string;
  rarity: number;
  stats: CombatStats;
  level: number;
}

export function FighterCard({
  fighter,
  label,
  hp,
  acting,
}: {
  fighter: Fighter;
  label: string;
  hp: number;
  acting: boolean;
}) {
  const maxHp = fighter.stats.hp;
  return (
    <div className={`fighter-card${acting ? ' acting' : ''}`}>
      <span className="pill" style={{ color: RARITIES[fighter.rarity].color }}>
        {RARITIES[fighter.rarity].name} · Lv.{fighter.level}
      </span>
      <SpeciesImage species={fighter} style={{ filter: fighter.filter }} />
      <h3>{fighter.name}</h3>
      <small>{label}</small>
      <div className="hp-bar">
        <i style={{ width: `${Math.max(0, (hp / maxHp) * 100)}%` }} />
      </div>
      <small>
        ❤️ {Math.max(0, hp)} / {maxHp}
      </small>
      <div className="fighter-stats">
        <span>⚔️ {fighter.stats.atk}</span>
        <span>🛡️ {fighter.stats.def}</span>
      </div>
    </div>
  );
}
