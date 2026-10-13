import type { SpeciesFamily } from '../api/types';
import { FAMILY_INFO } from '../utils/gameCalc';

// 종의 계열 표시(🔥 불꽃 · 🌿 숲 · ❄️ 서리). 계열이 아직 없는 종(옛 데이터)은 아무것도 그리지 않는다.
export function FamilyBadge({ family, compact }: { family?: SpeciesFamily | string | null; compact?: boolean }) {
  const info = family ? FAMILY_INFO[family as SpeciesFamily] : undefined;
  if (!info) return null;
  return (
    <span className={`family-badge family-${family}`} title={`${info.name} 계열`}>
      {info.icon}
      {!compact && ` ${info.name}`}
    </span>
  );
}
