import { useState } from 'react';
import type { LeaderboardEntry, LeaderboardResult } from '../api/types';
import { formatNumber } from '../utils/gameCalc';

type RankingTab = 'level' | 'income' | 'pvp';

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function RankRow({ entry, valueLabel }: { entry: LeaderboardEntry; valueLabel: string }) {
  return (
    <div className={`ranking-row${entry.isMe ? ' me' : ''}`}>
      <span className="ranking-rank">{RANK_MEDAL[entry.rank] ?? entry.rank}</span>
      {entry.avatarUrl ? (
        <img src={entry.avatarUrl} alt="" className="ranking-avatar" />
      ) : (
        <span className="ranking-avatar ranking-avatar-fallback">{entry.displayName.slice(0, 1)}</span>
      )}
      <span className="ranking-name">
        {entry.displayName}
        {entry.isMe && <span className="ranking-me-badge">나</span>}
      </span>
      <strong className="ranking-value">{valueLabel}</strong>
    </div>
  );
}

function RankingList({ result, loading, valueOf }: {
  result: LeaderboardResult | null;
  loading: boolean;
  valueOf: (value: number) => string;
}) {
  if (loading && !result) {
    return <p className="empty">랭킹을 불러오는 중이에요...</p>;
  }
  if (!result || result.entries.length === 0) {
    return <p className="empty">아직 랭킹 데이터가 없어요.</p>;
  }
  return (
    <div className="ranking-list">
      {result.entries.map((entry) => (
        <RankRow key={entry.userId} entry={entry} valueLabel={valueOf(entry.value)} />
      ))}
      {result.me && !result.me.inTop && (
        <>
          <div className="ranking-divider">···</div>
          <RankRow entry={result.me} valueLabel={valueOf(result.me.value)} />
        </>
      )}
    </div>
  );
}

export function RankingView({
  levelLeaderboard,
  incomeLeaderboard,
  pvpLeaderboard,
  loading,
  onRefresh,
}: {
  levelLeaderboard: LeaderboardResult | null;
  incomeLeaderboard: LeaderboardResult | null;
  pvpLeaderboard: LeaderboardResult | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<RankingTab>('level');

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">GROVE LEADERBOARD</p>
          <h1>랭킹</h1>
          <p className="subheading">다른 숲지기들은 얼마나 키웠을까요?</p>
        </div>
        <button className="button secondary" onClick={onRefresh} disabled={loading}>
          {loading ? '불러오는 중...' : '🔄 새로고침'}
        </button>
      </div>

      <div className="filter-row">
        <button className={`filter${tab === 'level' ? ' active' : ''}`} onClick={() => setTab('level')}>
          숲 레벨 랭킹
        </button>
        <button className={`filter${tab === 'income' ? ' active' : ''}`} onClick={() => setTab('income')}>
          분당 수익 랭킹
        </button>
        <button className={`filter${tab === 'pvp' ? ' active' : ''}`} onClick={() => setTab('pvp')}>
          투기장 레이팅
        </button>
      </div>

      <section className="panel">
        {tab === 'level' && (
          <RankingList result={levelLeaderboard} loading={loading} valueOf={(v) => `Lv. ${v}`} />
        )}
        {tab === 'income' && (
          <RankingList
            result={incomeLeaderboard}
            loading={loading}
            valueOf={(v) => `${formatNumber(v)} G/분`}
          />
        )}
        {tab === 'pvp' && (
          <RankingList result={pvpLeaderboard} loading={loading} valueOf={(v) => `${formatNumber(v)}점`} />
        )}
      </section>
    </section>
  );
}
