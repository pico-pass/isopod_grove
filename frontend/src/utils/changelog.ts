import changelogSource from '../data/CHANGELOG.md?raw';

// 게임 안 '업데이트 내역' 화면의 데이터. 원본은 data/CHANGELOG.md이고, 아래 형식을 그대로 읽는다.
//   ## 2026-10-16        날짜(최신이 위)
//   ### ✨ 신규 기능      카테고리(신규·밸런스·수정·기타를 이름으로 구분)
//   - 항목               줄 맨 앞의 "- "가 항목, 들여쓴 "  - "는 바로 위 항목의 세부 내용
// 첫 "## 날짜" 앞의 소개글과 표, "---" 같은 나머지 줄은 읽지 않는다.

export type ChangelogCategory = 'feature' | 'balance' | 'fix' | 'etc';

export interface ChangelogItem {
  text: string;
  details: string[];
}

export interface ChangelogSection {
  category: ChangelogCategory;
  items: ChangelogItem[];
}

export interface ChangelogDay {
  date: string; // YYYY-MM-DD
  sections: ChangelogSection[];
}

export const CHANGELOG_CATEGORY_LABELS: Record<ChangelogCategory, { icon: string; name: string }> = {
  feature: { icon: '✨', name: '신규 기능' },
  balance: { icon: '⚖️', name: '밸런스' },
  fix: { icon: '🐛', name: '수정' },
  etc: { icon: '🛠️', name: '기타' },
};

// 게임 화면에 보여 주는 카테고리. 기타(문서·빌드·정리)는 플레이와 관계없어서 뺀다.
export const CHANGELOG_VISIBLE_CATEGORIES: readonly ChangelogCategory[] = ['feature', 'balance', 'fix'];

const DAY_RE = /^##\s+(\d{4}-\d{2}-\d{2})\s*$/;
const CATEGORY_RE = /^###\s+(.+?)\s*$/;
const ITEM_RE = /^-\s+(.+?)\s*$/;
const DETAIL_RE = /^\s{2,}-\s+(.+?)\s*$/;
// 커밋 해시 "(4ee731a)", "(f1a994c, c5b1ccb)"와 "*(커밋 대기)*"는 개발자용 표시라 화면에서는 지운다.
const COMMIT_REF_RE = /\s*\((?:[0-9a-f]{7}(?:,\s*)?)+\)/g;
const PENDING_RE = /\s*\*\(커밋 대기\)\*/g;

export function categoryFromHeading(heading: string): ChangelogCategory | null {
  if (heading.includes('신규')) return 'feature';
  if (heading.includes('밸런스')) return 'balance';
  if (heading.includes('수정')) return 'fix';
  if (heading.includes('기타')) return 'etc';
  return null;
}

function clean(text: string): string {
  return text.replace(COMMIT_REF_RE, '').replace(PENDING_RE, '').trim();
}

export function parseChangelog(source: string): ChangelogDay[] {
  const days: ChangelogDay[] = [];
  let day: ChangelogDay | null = null;
  let section: ChangelogSection | null = null;
  let item: ChangelogItem | null = null;

  for (const line of source.split(/\r?\n/)) {
    const dayMatch = DAY_RE.exec(line);
    if (dayMatch) {
      day = { date: dayMatch[1], sections: [] };
      days.push(day);
      section = null;
      item = null;
      continue;
    }
    if (!day) continue;

    const categoryMatch = CATEGORY_RE.exec(line);
    if (categoryMatch) {
      const category = categoryFromHeading(categoryMatch[1]);
      section = category ? { category, items: [] } : null;
      if (section) day.sections.push(section);
      item = null;
      continue;
    }
    if (!section) continue;

    const detailMatch = DETAIL_RE.exec(line);
    if (detailMatch) {
      if (item) item.details.push(clean(detailMatch[1]));
      continue;
    }
    const itemMatch = ITEM_RE.exec(line);
    if (itemMatch) {
      item = { text: clean(itemMatch[1]), details: [] };
      section.items.push(item);
    }
  }
  return days;
}

// 게임 화면에 보여 줄 날짜 목록(기타를 뺀 뒤 항목이 남는 날짜만, 최신이 위).
export function visibleChangelog(days: ChangelogDay[]): ChangelogDay[] {
  const out: ChangelogDay[] = [];
  for (const day of days) {
    const sections = day.sections.filter((s) => CHANGELOG_VISIBLE_CATEGORIES.includes(s.category) && s.items.length > 0);
    if (sections.length > 0) out.push({ date: day.date, sections });
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export const CHANGELOG_DAYS: ChangelogDay[] = visibleChangelog(parseChangelog(changelogSource));
export const LATEST_CHANGELOG_DATE: string | null = CHANGELOG_DAYS[0]?.date ?? null;

const SEEN_KEY = 'isopod-changelog-seen';

// 마지막으로 업데이트 내역 화면을 열어 본 시점의 최신 날짜. 저장된 값이 없으면 null(한 번도 안 본 사람).
export function loadSeenChangelogDate(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

export function saveSeenChangelogDate(date: string): void {
  try {
    localStorage.setItem(SEEN_KEY, date);
  } catch {
    // 저장하지 못하면 다음 접속에도 NEW 표시가 남을 뿐이다.
  }
}

// 사이드바의 NEW 표시: 최신 내역 날짜를 아직 못 본 경우.
export function hasUnseenChangelog(seen: string | null, latest: string | null = LATEST_CHANGELOG_DATE): boolean {
  return latest !== null && (seen === null || seen < latest);
}

// "2026-10-16" → "2026년 10월 16일 (금)". 시간대 영향을 받지 않게 연·월·일로 직접 만든다.
export function formatChangelogDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()];
  return `${y}년 ${m}월 ${d}일 (${weekday})`;
}
