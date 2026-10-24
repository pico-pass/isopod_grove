// ---- 사육장 관리인 고용 ----
// 월급을 골드로 매일 내면 NPC 관리인이 자동 급식·분무(자동 급식기·분무기와 같은 효과)와 수익 수령을 대신 해 주고 수익이 조금 늘어난다.
// 월급제라 접속하지 않아도 날짜가 지나면 골드가 나가는 상시 소비처이고, 등급이 높을수록 월급이 비싸다(월급이 늘어나는 수익보다 많다 — 시간 대신 돈을 쓰는 편의 서비스).
// 월급은 "내 시간당 최대 수익 × 등급별 시간"(최소 월급 있음)이라 경제 규모에 맞춰 오른다. 다음 날 처음 접속(틱)할 때 지난 날짜만큼 한꺼번에 나가고, 골드가 모자라면 관리인이 떠난다.

export interface ManagerGrade {
  id: string;
  name: string;
  icon: string;
  hours: number; // 하루 월급 = 시간당 최대 수익 × 이 값
  minWage: number; // 수익이 아주 작은 계정의 최소 월급
  incomeBonus: number; // 자동 수익 +비율
}

export const MANAGER_GRADES: readonly ManagerGrade[] = [
  { id: 'rookie', name: '견습 관리인', icon: '🧑‍🌾', hours: 1, minWage: 5_000, incomeBonus: 0.02 },
  { id: 'skilled', name: '숙련 관리인', icon: '👩‍🌾', hours: 2, minWage: 20_000, incomeBonus: 0.04 },
  { id: 'veteran', name: '베테랑 관리인', icon: '🧑‍🏫', hours: 4, minWage: 60_000, incomeBonus: 0.06 },
  { id: 'master', name: '명인 관리인', icon: '🧙', hours: 8, minWage: 200_000, incomeBonus: 0.08 },
];

export const MANAGER_MAX_CATCHUP_DAYS = 30; // 오래 접속하지 않았을 때 한꺼번에 낼 수 있는 최대 일수

export const findManagerGrade = (id: string | null | undefined): ManagerGrade | undefined => MANAGER_GRADES.find((g) => g.id === id);

// 하루 월급(골드): 시간당 최대 수익 × 등급 시간, 천 단위 반올림, 최소 월급 이상
export function managerWage(grade: ManagerGrade, hourlyPotential: number): number {
  const byIncome = Math.round((Math.max(0, hourlyPotential) * grade.hours) / 1000) * 1000;
  return Math.max(grade.minWage, byIncome);
}
