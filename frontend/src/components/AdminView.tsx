import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AdminStats } from '../api/types';
import { formatNumber } from '../utils/gameCalc';
import { AdminMailPanel } from './AdminMailPanel';

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}시간 ${m}분` : m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

export function AdminView() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await api.getAdminStats());
    } catch (e) {
      setError(e instanceof Error ? e.message : '통계를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(() => load());
  }, [load]);

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">SERVER ADMIN</p>
          <h1>서버 관리</h1>
          <p className="subheading">관리자에게만 보이는 숲 전체 현황이에요.</p>
        </div>
        <button className="button secondary" onClick={load} disabled={loading}>
          {loading ? '불러오는 중...' : '🔄 새로고침'}
        </button>
      </div>

      {error && <p className="empty">문제가 발생했어요: {error}</p>}
      {!error && loading && !stats && <p className="empty">통계를 불러오는 중이에요...</p>}

      {stats && (
        <>
          <div className="journal-overview">
            <div className="journal-stat">
              가입 유저
              <strong>
                {formatNumber(stats.players.users)} <small>명</small>
              </strong>
            </div>
            <div className="journal-stat">
              게임 저장 계정
              <strong>
                {formatNumber(stats.players.gameStates)} <small>개</small>
              </strong>
            </div>
            <div className="journal-stat">
              전체 보유 골드
              <strong>
                {formatNumber(stats.economy.coins)} <small>G</small>
              </strong>
            </div>
            <div className="journal-stat">
              전체 보유 다이아
              <strong>
                {formatNumber(stats.economy.diamonds)} <small>💎</small>
              </strong>
            </div>
            <div className="journal-stat">
              전체 보유 탐색권
              <strong>
                {formatNumber(stats.economy.explorationTickets)} <small>장</small>
              </strong>
            </div>
          </div>

          <AdminMailPanel />

          <section className="panel">
            <div className="panel-heading">
              <h2>📦 콘텐츠 데이터</h2>
            </div>
            <p>
              종 {stats.content.species}개 · 업그레이드 {stats.content.upgrades}개 · 일일 목표{' '}
              {stats.content.quests}개 · 업적 {stats.content.achievements}개
            </p>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>🖥️ 서버 상태</h2>
            </div>
            <p>
              가동 시간 {formatUptime(stats.server.uptimeSeconds)} · Node{' '}
              {stats.server.nodeVersion} · {stats.server.platform}
              <br />
              메모리 사용량 RSS {stats.server.memory.rssMb}MB · Heap{' '}
              {stats.server.memory.heapUsedMb}MB
            </p>
          </section>
        </>
      )}
    </section>
  );
}
