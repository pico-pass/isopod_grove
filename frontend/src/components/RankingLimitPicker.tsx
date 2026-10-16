import { RANKING_LIMITS, type RankingLimit } from '../utils/rankingLimit';

// 랭킹에서 볼 인원 수(20·50·100명)를 고르는 버튼 묶음. 모든 랭킹 화면이 같이 쓴다.
export function RankingLimitPicker({
  value,
  onChange,
  disabled,
}: {
  value: RankingLimit;
  onChange: (limit: RankingLimit) => void;
  disabled?: boolean;
}) {
  return (
    <div className="filter-row ranking-limit" role="group" aria-label="보여줄 인원 수">
      <span className="ranking-limit-label">보기</span>
      {RANKING_LIMITS.map((n) => (
        <button key={n} className={`filter${value === n ? ' active' : ''}`} disabled={disabled} onClick={() => onChange(n)}>
          {n}명
        </button>
      ))}
    </div>
  );
}
