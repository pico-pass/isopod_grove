import type { BattleRules } from '../api/types';
import { FAMILY_INFO } from '../utils/gameCalc';

const percentOf = (multiplier: number) => {
  const p = Math.round((multiplier - 1) * 100);
  return p > 0 ? `+${p}%` : `${p}%`;
};

// 이번 전투에 적용된 환경과 계열 상성(공격력·방어력 보정)을 보여준다. 서버가 계산한 배율을 그대로 쓴다.
export function BattleRulesBanner({ rules }: { rules: BattleRules }) {
  const { environment, mine, enemy } = rules;
  const mineInfo = FAMILY_INFO[mine.family];
  const enemyInfo = FAMILY_INFO[enemy.family];
  const matchupText =
    mine.matchup === 'advantage'
      ? `${mineInfo.icon} ${mineInfo.name}이(가) ${enemyInfo.icon} ${enemyInfo.name}에 강해요`
      : mine.matchup === 'disadvantage'
        ? `${mineInfo.icon} ${mineInfo.name}은(는) ${enemyInfo.icon} ${enemyInfo.name}에 약해요`
        : `${mineInfo.icon} ${mineInfo.name} · ${enemyInfo.icon} ${enemyInfo.name}: 상성 없음`;
  return (
    <div className="rules-banner" role="note">
      {environment && (
        <p>
          <b>{environment.name}</b> — {environment.description}
        </p>
      )}
      <p>
        <span className={`rules-matchup ${mine.matchup}`}>{matchupText}</span>
        <span className="rules-mult">
          내 공격·방어 <b className={mine.multiplier >= 1 ? 'up' : 'down'}>{percentOf(mine.multiplier)}</b> · 상대{' '}
          <b className={enemy.multiplier >= 1 ? 'up' : 'down'}>{percentOf(enemy.multiplier)}</b>
        </span>
      </p>
    </div>
  );
}
