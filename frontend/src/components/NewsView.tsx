import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { NewsEditionView } from '../api/types';
import { formatChangelogDate } from '../utils/changelog';

// 숲 신문: 어제 숲에서 있었던 일(날씨·전설/신화 발견·던전·미니게임 1등 등)을 모아 매일 한 호씩 실려요.
export function NewsView() {
  const [edition, setEdition] = useState<NewsEditionView | null>(null);
  const [failed, setFailed] = useState(false);

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        setEdition(await api.getNews());
      } catch {
        setFailed(true);
      }
    });
  }, []);

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">FOREST TIMES</p>
          <h1>숲 신문</h1>
          <p className="subheading">어제 숲에서 있었던 일을 모아 매일 새로 나와요.</p>
        </div>
      </div>
      {failed && <p className="empty">신문을 불러오지 못했어요. 새로고침으로 다시 시도해 주세요.</p>}
      {!edition && !failed && <p className="empty">신문을 펼치는 중이에요…</p>}
      {edition && (
        <article className="news-paper">
          <header className="news-masthead">
            <h2>🍃 숲 신문</h2>
            <span>{formatChangelogDate(edition.dayKey)} 발행 · 기사 대상 {formatChangelogDate(edition.yesterday)}</span>
          </header>
          {edition.headline && (
            <section className="news-top">
              <span className="news-section">
                {edition.headline.icon} {edition.headline.section}
              </span>
              <h3>{edition.headline.headline}</h3>
              <p>{edition.headline.body}</p>
            </section>
          )}
          <div className="news-grid">
            {edition.articles.slice(1).map((a) => (
              <section key={a.id} className={`news-card section-${a.id}`}>
                <span className="news-section">
                  {a.icon} {a.section}
                </span>
                <h4>{a.headline}</h4>
                <p>{a.body}</p>
              </section>
            ))}
          </div>
        </article>
      )}
    </section>
  );
}
