import { SPECIES_FAMILIES, type SpeciesFamily } from '../species/species.family';
import { seededRandom } from './dungeon-engine';
import { hashDay } from './wanted-engine';
import { addDays } from './event-engine';
import { getPuzzleDayKey } from './puzzle-engine';

// ---- 오늘의 운세 ----
// 하루에 한 번 운세를 뽑으면 그날의 행운 계열과 소소한 효과가 정해진다. 효과는 전부 이득 쪽이라 벌칙이 없고(흉이 없다),
// 뽑는 순간 받는 골드·💎·🎟️과 그날(한국 시간 자정까지) 행운 계열의 번식 속도·숲 탐색 확률이 조금 오른다.
// 같은 유저가 같은 날 뽑는 결과는 항상 같다(유저 id와 날짜로 시드를 만든다). 7일 연속으로 뽑으면 보너스가 나온다.

export interface FortuneGrade {
  id: string;
  name: string;
  icon: string;
  weight: number; // 뽑힐 비중(합 100)
  gold: number;
  diamonds: number;
  tickets: number;
  breedPercent: number; // 행운 계열 번식 진행 증가(%)
  exploreMult: number; // 행운 계열이 숲 탐색·원정에서 나올 가중치 배율
}

export const FORTUNE_GRADES: readonly FortuneGrade[] = [
  { id: 'great', name: '대길', icon: '🌟', weight: 5, gold: 100_000, diamonds: 2, tickets: 1, breedPercent: 10, exploreMult: 2 },
  { id: 'good', name: '중길', icon: '✨', weight: 20, gold: 50_000, diamonds: 1, tickets: 0, breedPercent: 7, exploreMult: 1.6 },
  { id: 'small', name: '소길', icon: '🍀', weight: 45, gold: 25_000, diamonds: 0, tickets: 0, breedPercent: 5, exploreMult: 1.4 },
  { id: 'late', name: '말길', icon: '🌱', weight: 30, gold: 10_000, diamonds: 0, tickets: 0, breedPercent: 3, exploreMult: 1.2 },
];

export const FORTUNE_COLORS: readonly { name: string; icon: string }[] = [
  { name: '빨강', icon: '🔴' },
  { name: '주황', icon: '🟠' },
  { name: '노랑', icon: '🟡' },
  { name: '초록', icon: '🟢' },
  { name: '파랑', icon: '🔵' },
  { name: '보라', icon: '🟣' },
  { name: '갈색', icon: '🟤' },
  { name: '하양', icon: '⚪' },
];

export const FORTUNE_LINES: readonly string[] = [
  '낙엽 아래에서 뜻밖의 친구를 만날 거예요.',
  '서두르지 않는 콩벌레가 가장 멀리 가요.',
  '오늘 모은 한 알의 흙이 내일의 둥지가 돼요.',
  '반가운 소식이 이끼 위를 굴러 올 거예요.',
  '오래 기다린 새끼가 눈을 뜨는 날이에요.',
  '낯선 숲길이 오늘은 유난히 다정해요.',
  '작은 걸음이 모여 큰 숲이 돼요.',
  '비 온 뒤 흙냄새가 행운을 데려와요.',
  '오늘은 둥글게 몸을 말고 한 번 쉬어 가도 좋아요.',
  '평소 지나치던 구석에 보물이 숨어 있어요.',
  '함께 사는 식구들이 오늘따라 든든해요.',
  '한 번 더 도전하면 길이 열릴 거예요.',
  '달빛이 비치는 곳에 행운이 머물러요.',
  '조용한 하루 끝에 좋은 일이 기다려요.',
  '새로운 이름을 도감에 적게 될지도 몰라요.',
  '이슬이 맺힌 아침, 좋은 예감이 들어요.',
  '친구에게 인사를 건네면 복이 돌아와요.',
  '오늘의 선택이 숲의 내일을 바꿔요.',
  '느긋한 걸음이 행운의 지름길이에요.',
  '따뜻한 한 끼처럼 포근한 일이 생길 거예요.',
  '지나온 길마다 작은 꽃이 피어 있어요.',
  '오늘은 무엇을 해도 숲이 응원해 줘요.',
];

export const FORTUNE_STREAK_EVERY = 7;
export const FORTUNE_STREAK_BONUS = { gold: 0, diamonds: 3, tickets: 2 };

export interface DrawnFortune {
  gradeId: string;
  family: SpeciesFamily;
  color: number; // FORTUNE_COLORS 인덱스
  number: number; // 행운의 숫자(1~99)
  line: number; // FORTUNE_LINES 인덱스
}

export function findFortuneGrade(id: string): FortuneGrade | undefined {
  return FORTUNE_GRADES.find((g) => g.id === id);
}

// 유저와 날짜로 결과를 정한다(같은 입력이면 항상 같다)
export function drawFortune(userId: string, day: string): DrawnFortune {
  const rng = seededRandom(hashDay(`${userId}:${day}`), 71);
  const total = FORTUNE_GRADES.reduce((a, g) => a + g.weight, 0);
  let r = rng() * total;
  let grade = FORTUNE_GRADES[FORTUNE_GRADES.length - 1];
  for (const g of FORTUNE_GRADES) {
    r -= g.weight;
    if (r < 0) {
      grade = g;
      break;
    }
  }
  return {
    gradeId: grade.id,
    family: SPECIES_FAMILIES[Math.min(SPECIES_FAMILIES.length - 1, Math.floor(rng() * SPECIES_FAMILIES.length))],
    color: Math.min(FORTUNE_COLORS.length - 1, Math.floor(rng() * FORTUNE_COLORS.length)),
    number: 1 + Math.min(98, Math.floor(rng() * 99)),
    line: Math.min(FORTUNE_LINES.length - 1, Math.floor(rng() * FORTUNE_LINES.length)),
  };
}

// 오늘 뽑을 때의 연속 일수: 어제 뽑았으면 이어지고, 아니면 1부터
export function nextFortuneStreak(prev: { day?: string; streak?: number } | null | undefined, today: string): number {
  if (prev?.day && prev.day === addDays(today, -1)) return (prev.streak ?? 0) + 1;
  return 1;
}

// 화면에 보여 줄 연속 일수: 마지막으로 뽑은 날이 오늘이나 어제일 때만 이어진 것으로 본다
export function activeFortuneStreak(prev: { day?: string; streak?: number } | null | undefined, today: string): number {
  if (!prev?.day) return 0;
  return prev.day === today || prev.day === addDays(today, -1) ? (prev.streak ?? 0) : 0;
}

export function fortuneStreakBonus(streak: number): typeof FORTUNE_STREAK_BONUS | null {
  return streak > 0 && streak % FORTUNE_STREAK_EVERY === 0 ? FORTUNE_STREAK_BONUS : null;
}

// 그 한국 날짜의 시작·끝 시각(ms)
export function fortuneDayRange(day: string): { from: number; to: number } {
  const from = Date.parse(`${day}T00:00:00+09:00`);
  return { from, to: from + 86_400_000 };
}

export interface FortuneEffect {
  family: SpeciesFamily;
  breedFactor: number;
  exploreMult: number;
  from: number;
  to: number;
}

// 저장된 운세에서 효과를 꺼낸다(없거나 알 수 없는 등급이면 null). 효과는 from~to(그 한국 날짜) 동안만 유효하다.
export function fortuneEffectOf(fortune: { day?: string; gradeId?: string; family?: string } | null | undefined): FortuneEffect | null {
  if (!fortune?.day || !fortune.gradeId || !fortune.family) return null;
  const grade = findFortuneGrade(fortune.gradeId);
  if (!grade || !(SPECIES_FAMILIES as readonly string[]).includes(fortune.family)) return null;
  const range = fortuneDayRange(fortune.day);
  return { family: fortune.family as SpeciesFamily, breedFactor: 1 + grade.breedPercent / 100, exploreMult: grade.exploreMult, ...range };
}

// 지금(now) 유효한 운세 효과, 그날이 아니면 null
export function activeFortuneEffect(fortune: { day?: string; gradeId?: string; family?: string } | null | undefined, now = Date.now()): FortuneEffect | null {
  const fx = fortuneEffectOf(fortune);
  return fx && fortune?.day === getPuzzleDayKey(now) ? fx : null;
}
