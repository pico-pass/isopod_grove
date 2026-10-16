import { Fragment, useEffect, useState, type ReactNode } from 'react';
import {
  CHANGELOG_CATEGORY_LABELS,
  CHANGELOG_DAYS,
  CHANGELOG_VISIBLE_CATEGORIES,
  LATEST_CHANGELOG_DATE,
  formatChangelogDate,
  type ChangelogCategory,
} from '../utils/changelog';

// 항목 글의 **굵게**와 `코드`만 꾸며 준다(원본이 마크다운이라서).
function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={i}>{part.slice(1, -1)}</code>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

type Filter = 'all' | ChangelogCategory;

export function ChangelogView({
  seenDate,
  onSeen,
}: {
  seenDate: string | null; // 이 화면을 열기 전까지 본 최신 날짜(그보다 새 날짜에 NEW 표시)
  onSeen: (latest: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  // 열자마자 sidebar의 NEW가 꺼져도, 이 화면 안에서는 처음 열 때 기준으로 새 날짜를 계속 표시한다.
  const [seenAtOpen] = useState(seenDate);

  useEffect(() => {
    if (LATEST_CHANGELOG_DATE) onSeen(LATEST_CHANGELOG_DATE);
  }, [onSeen]);

  const counts: Record<ChangelogCategory, number> = { feature: 0, balance: 0, fix: 0, etc: 0 };
  for (const day of CHANGELOG_DAYS) for (const s of day.sections) counts[s.category] += s.items.length;

  const days = CHANGELOG_DAYS.map((day) => ({
    ...day,
    sections: day.sections.filter((s) => filter === 'all' || s.category === filter),
  })).filter((day) => day.sections.length > 0);

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PATCH NOTES</p>
          <h1>업데이트 내역</h1>
          <p className="subheading">새로 생긴 것과 달라진 것을 날짜별로 모아 뒀어요.</p>
        </div>
      </div>

      <div className="filter-row changelog-filters" role="group" aria-label="카테고리">
        <button className={`filter${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>
          전체
        </button>
        {CHANGELOG_VISIBLE_CATEGORIES.map((category) => (
          <button
            key={category}
            className={`filter${filter === category ? ' active' : ''}`}
            onClick={() => setFilter(category)}
          >
            {CHANGELOG_CATEGORY_LABELS[category].icon} {CHANGELOG_CATEGORY_LABELS[category].name} {counts[category]}
          </button>
        ))}
      </div>

      {days.length === 0 && <p className="empty">아직 올라온 업데이트가 없어요.</p>}
      {days.map((day) => (
        <article className="panel changelog-day" key={day.date}>
          <header className="changelog-day-head">
            <h2>{formatChangelogDate(day.date)}</h2>
            {(seenAtOpen === null ? day.date === LATEST_CHANGELOG_DATE : day.date > seenAtOpen) && (
              <span className="changelog-new">NEW</span>
            )}
          </header>
          {day.sections.map((section) => (
            <div className={`changelog-section ${section.category}`} key={section.category}>
              <h3>
                {CHANGELOG_CATEGORY_LABELS[section.category].icon} {CHANGELOG_CATEGORY_LABELS[section.category].name}
              </h3>
              <ul>
                {section.items.map((item, i) => (
                  <li key={i}>
                    {renderInline(item.text)}
                    {item.details.length > 0 && (
                      <ul>
                        {item.details.map((detail, j) => (
                          <li key={j}>{renderInline(detail)}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </article>
      ))}
    </section>
  );
}
