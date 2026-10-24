import { WEATHER_KINDS, type WeatherType } from '../weather/weather.data';

// ---- 숲 신문 ----
// 어제 서버에서 있었던 일(날씨·전설/신화 발견·던전·미니게임 1등 등)을 모아 기사 몇 개로 만든다. 이 파일은 "자료 → 기사" 변환만 하는 순수 함수라서
// 자료는 서비스(news.service.ts)가 모아서 넘긴다. 자료가 비는 항목은 기사에서 빠지고, 아무 일도 없었으면 조용한 하루 기사가 나간다.
export type NewsSection = '날씨' | '발견' | '도전' | '랭킹' | '소식';

export interface NewsArticle {
  id: string;
  section: NewsSection;
  icon: string;
  headline: string;
  body: string;
}

export interface NewsInput {
  dayKey: string; // 발행일(오늘)
  yesterday: string; // 기사 대상 날짜
  weather: { dominant: WeatherType | null; maxTempC: number | null; minTempC: number | null };
  // 전설·신화 발견: 희귀도 높은 순(신화 먼저), 최대 몇 건만 줘도 된다
  rare: { userName: string; speciesName: string; rarity: number; via: string }[];
  // 어제 가장 높이 오른 던전 기록과 도전 횟수
  dungeon: { userName: string; difficultyName: string; floors: number; cleared: boolean } | null;
  dungeonRuns: number;
  wantedGold: string[]; // 어제 수배 금등급을 잡은 사람들
  puzzle: { userName: string; cleared: number; excess: number } | null;
  puzzleParticipants: number;
  runner: { userName: string; meters: number } | null;
  runnerParticipants: number;
  stack: { userName: string; height: number } | null;
  stackParticipants: number;
  quiz: { userName: string; streak: number } | null;
  quizParticipants: number;
  shop: { userName: string; efficiency: number } | null;
  shopParticipants: number;
  // 어제 마감한 매일 경매의 낙찰 결과(낙찰자가 있는 것만, 물건 번호 순). 없으면 비어 있거나 생략한다.
  auction?: { name: string; icon: string; userName: string; amount: number }[];
}

const RARITY_NAMES = ['일반', '희귀', '에픽', '전설', '신화'];
export const NEWS_TIPS: readonly string[] = [
  '던전의 문지기로 식구를 세워 두면 다른 숲지기가 지나갈 때마다 통행료가 쌓여요.',
  '강력한 일격은 리듬 일격으로 쏠 때 가운데에서 멈추면 피해가 최대 30% 늘어요.',
  '현상수배 보스는 장비 금지·레벨 제한 같은 조건이 매일 바뀌어요. 조건에 맞는 식구를 미리 키워 두세요.',
  '하극상 대회는 희귀도 일반 콩벌레만 나갈 수 있어요. 잘 안 쓰던 일반 종이 주인공이에요.',
  '버섯 가게는 날씨에 따라 손님이 달라져요. 비 오는 날엔 표고버섯이 잘 팔려요.',
  '콩 쌓기는 딱 맞추면 퍼펙트! 세 번 이어지면 통나무가 다시 넓어져요.',
  '이 콩 누구? 는 맞힐 때마다 제한 시간이 0.1초씩 줄어요. 도감을 외워 두면 유리해요.',
  '사육장에 같은 계열 장식을 놓으면 그 계열 콩벌레의 번식이 빨라져요.',
  '비가 오는 날에는 사육장 습도가 천천히 줄어요. 분무를 아껴도 돼요.',
  '원정은 하루 5번, 대원정은 하루 3번이에요. 신화 천장도 잊지 마세요.',
  '장 보스를 이기면 공격·방어·체력이 오르고 에픽 유물을 고를 수 있어요.',
  '친구의 사육장을 방문해서 마음에 들면 좋아요를 눌러 보세요.',
];

const dateLabel = (key: string): string => {
  const [, m, d] = key.split('-').map(Number);
  return `${m}월 ${d}일`;
};

const has = <T>(v: T | null | undefined): v is T => v !== null && v !== undefined;

// 기사 목록을 만든다. 맨 앞 기사가 1면 머리기사다.
export function buildNewsArticles(input: NewsInput): NewsArticle[] {
  const day = dateLabel(input.yesterday);
  const articles: NewsArticle[] = [];

  // 전설·신화 발견
  const mythic = input.rare.filter((r) => r.rarity >= 4);
  const legend = input.rare.filter((r) => r.rarity === 3);
  if (input.rare.length > 0) {
    const first = input.rare[0];
    const lines = input.rare.slice(0, 4).map((r) => `· ${r.userName}님 — ${RARITY_NAMES[r.rarity] ?? '희귀'} ${r.speciesName} (${r.via === 'expedition' ? '원정' : '숲 탐색'})`);
    articles.push({
      id: 'rare',
      section: '발견',
      icon: mythic.length > 0 ? '🌟' : '✨',
      headline: mythic.length > 0 ? `신화 ${first.speciesName}, ${first.userName}님의 품으로!` : `전설 ${first.speciesName}이(가) ${first.userName}님을 찾아왔어요`,
      body: `${day} 숲에서 전설 이상의 콩벌레가 ${input.rare.length}번 나타났어요(신화 ${mythic.length}번 · 전설 ${legend.length}번).\n${lines.join('\n')}`,
    });
  }

  // 던전
  if (input.dungeon) {
    articles.push({
      id: 'dungeon',
      section: '도전',
      icon: '🪵',
      headline: `${input.dungeon.userName}님, ${input.dungeon.difficultyName} 던전 ${input.dungeon.floors}층${input.dungeon.cleared ? ' 완주!' : ' 돌파!'}`,
      body: `${day} 썩은 통나무 던전에는 모두 ${input.dungeonRuns}번의 도전이 있었어요. 가장 높이 오른 숲지기는 ${input.dungeon.userName}님으로, ${input.dungeon.difficultyName} 난이도 ${input.dungeon.floors}층까지 올랐어요.`,
    });
  }
  if (input.wantedGold.length > 0) {
    const names = [...new Set(input.wantedGold)];
    articles.push({
      id: 'wanted',
      section: '도전',
      icon: '🎯',
      headline: `수배 보스 금등급 검거 ${names.length}명`,
      body: `${day} 현상수배 보스의 금등급을 ${names.slice(0, 5).map((n) => `${n}님`).join(', ')}${names.length > 5 ? ' 외' : ''}이(가) 잡았어요.`,
    });
  }

  // 미니게임 1등
  const ranks: string[] = [];
  if (input.puzzle) ranks.push(`🧩 퍼즐 — ${input.puzzle.userName}님 ${input.puzzle.cleared}단계 클리어(초과 +${input.puzzle.excess}수) · ${input.puzzleParticipants}명 참가`);
  if (input.runner) ranks.push(`🏃 콩 달리기 — ${input.runner.userName}님 ${input.runner.meters.toLocaleString('ko-KR')}m · ${input.runnerParticipants}명 참가`);
  if (input.stack) ranks.push(`🪵 콩 쌓기 — ${input.stack.userName}님 ${input.stack.height}칸 · ${input.stackParticipants}명 참가`);
  if (input.quiz) ranks.push(`❓ 이 콩 누구? — ${input.quiz.userName}님 ${input.quiz.streak}연속 정답 · ${input.quizParticipants}명 참가`);
  if (input.shop) ranks.push(`🏪 버섯 가게 — ${input.shop.userName}님 효율 ${input.shop.efficiency}% · ${input.shopParticipants}명 참가`);
  if (ranks.length > 0) {
    articles.push({
      id: 'minigames',
      section: '랭킹',
      icon: '🏆',
      headline: `${day} 미니게임 1등 모음`,
      body: ranks.join('\n'),
    });
  }

  // 매일 경매: 가장 비싸게 낙찰된 물건을 머리로, 전체 낙찰 목록을 본문에
  const sold = [...(input.auction ?? [])];
  if (sold.length > 0) {
    const top = sold.reduce((a, b) => (b.amount > a.amount ? b : a));
    articles.push({
      id: 'auction',
      section: '랭킹',
      icon: '🔨',
      headline: `${top.userName}님, ${top.name}을(를) ${top.amount.toLocaleString('ko-KR')} G에 낙찰!`,
      body: `${day} 매일 경매 결과예요.\n${sold.map((s) => `${s.icon} ${s.name} — ${s.userName}님 ${s.amount.toLocaleString('ko-KR')} G`).join('\n')}`,
    });
  }

  // 날씨
  if (has(input.weather.dominant)) {
    const kind = WEATHER_KINDS[input.weather.dominant];
    const temps = has(input.weather.maxTempC) && has(input.weather.minTempC) ? ` 낮 최고 ${Math.round(input.weather.maxTempC)}°C, 최저 ${Math.round(input.weather.minTempC)}°C.` : '';
    const familyName = { fire: '불꽃', forest: '숲', frost: '서리' }[kind.family];
    articles.push({
      id: 'weather',
      section: '날씨',
      icon: kind.icon,
      headline: `어제 숲 날씨는 ${kind.name}`,
      body: `${kind.flavor}${temps} ${familyName} 계열 콩벌레의 번식이 빨라지는 날이었어요.`,
    });
  }

  if (articles.length === 0) {
    articles.push({
      id: 'quiet',
      section: '소식',
      icon: '🍃',
      headline: '조용한 하루였어요',
      body: `${day}은(는) 숲이 평화로웠어요. 오늘은 어떤 소식이 생길까요?`,
    });
  }

  const tip = NEWS_TIPS[((Math.floor(new Date(`${input.dayKey}T00:00:00Z`).getTime() / 86_400_000) % NEWS_TIPS.length) + NEWS_TIPS.length) % NEWS_TIPS.length];
  articles.push({ id: 'tip', section: '소식', icon: '💡', headline: '오늘의 한마디', body: tip });
  return articles;
}
