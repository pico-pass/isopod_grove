import type { GameState } from '../api/types';
import { formatNumber } from '../utils/gameCalc';

const ICONS: Record<string, string> = {
  leaf: '🌿',
  heart: '❤️',
  search: '🔍',
  coins: '🪙',
  sprout: '🌱',
  flag: '🚩',
  clock: '🕒',
};

export function JournalView({ gameState }: { gameState: GameState }) {
  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">GROVE JOURNAL</p>
          <h1>사육 일지</h1>
          <p className="subheading">작은 탄생부터 새로운 발견까지, 우리 숲의 이야기.</p>
        </div>
      </div>

      <div className="journal-overview">
        {[
          ['새로 태어난 식구', gameState.stats.births, '마리'],
          ['새집을 찾은 식구', gameState.stats.sold, '마리'],
          ['지금까지 받은 골드', gameState.stats.earned, 'G'],
          ['탐색 횟수', gameState.stats.explored, '회'],
        ].map(([label, n, unit]) => (
          <div className="journal-stat" key={label as string}>
            {label}
            <strong>
              {formatNumber(n as number)} <small>{unit}</small>
            </strong>
          </div>
        ))}
      </div>

      <div className="panel journal-list">
        {gameState.logs.length === 0 && <div className="empty">이곳에 작은 숲의 이야기가 쌓일 거예요.</div>}
        {gameState.logs.map((log, i) => (
          <div className="journal-entry" key={`${log.at}-${i}`}>
            <span>{ICONS[log.type] || '🌿'}</span>
            <div>
              <p>{log.text}</p>
              <time>
                {new Date(log.at).toLocaleString('ko-KR', {
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
