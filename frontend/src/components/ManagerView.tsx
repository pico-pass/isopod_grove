import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { ManagerResponse, ManagerStatus } from '../api/types';
import { formatNumber } from '../utils/gameCalc';

// 사육장 관리인: 월급을 매일 골드로 내면 관리인이 자동 급식·분무와 수익 수령을 대신 해 주고 수익이 조금 늘어요. 접속하지 않아도 날짜가 지나면 월급이 나가요.
export function ManagerView({
  paused,
  onHire,
  onDismiss,
}: {
  paused: boolean;
  onHire: (grade: string) => Promise<ManagerResponse | null>;
  onDismiss: () => Promise<ManagerResponse | null>;
}) {
  const [status, setStatus] = useState<ManagerStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        setStatus(await api.getManager());
      } catch {
        setFailed(true);
      }
    });
  }, []);

  const run = async (fn: () => Promise<ManagerResponse | null>) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fn();
      if (r) setStatus(r.status);
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    if (!status?.current) return;
    if (!window.confirm(`${status.current.name}을(를) 내보낼까요? 이미 낸 월급은 돌려받지 못해요.`)) return;
    void run(onDismiss);
  };

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">TERRARIUM KEEPER</p>
          <h1>
            사육장 관리인 <span>보유 {status ? formatNumber(status.coins) : '…'} G</span>
          </h1>
          <p className="subheading">월급을 매일 골드로 내면 관리인이 자동 급식·분무와 수익 수령을 대신 해 주고, 자동 수익이 조금 늘어요. 시간이 없는 숲지기를 위한 편의 서비스예요.</p>
        </div>
      </div>
      {failed && <p className="empty">관리인 정보를 불러오지 못했어요. 새로고침으로 다시 시도해 주세요.</p>}
      {!status && !failed && <p className="empty">관리인을 찾는 중이에요…</p>}
      {status && (
        <>
          <section className={`panel manager-current${status.current ? ' working' : ''}`}>
            {status.current ? (
              <>
                <div className="panel-heading">
                  <h2>
                    {status.current.icon} {status.current.name} 근무 중
                  </h2>
                  <button className="button secondary" disabled={busy || paused} onClick={dismiss}>
                    내보내기
                  </button>
                </div>
                <ul className="manager-effects">
                  <li>🍽️ 자동 급식·분무 (급식기·분무기와 같은 효과)</li>
                  <li>💰 모은 수익을 대신 받아 줘요</li>
                  <li>📈 자동 수익 +{Math.round(status.current.incomeBonus * 100)}%</li>
                </ul>
                <p className="manager-wage">
                  하루 월급 <b>{formatNumber(status.current.wage)} G</b> · 월급 낸 날 {status.current.paidThrough}
                  {status.current.owedDays > 0 && ` · 밀린 월급 ${status.current.owedDays}일치(다음에 접속하면 나가요)`} · 지금까지 낸 월급 {formatNumber(status.current.totalPaid)} G
                </p>
                <p className="manager-note">골드가 모자라 월급을 못 주면 관리인이 떠나요. 오래 접속하지 않아도 월급은 최대 {status.maxCatchupDays}일치까지만 나가요.</p>
              </>
            ) : (
              <p className="empty">고용 중인 관리인이 없어요. 아래에서 고용해 보세요.</p>
            )}
          </section>

          <div className="manager-grades">
            {status.grades.map((g) => {
              const mine = status.current?.grade === g.id;
              const afford = status.coins >= g.wage;
              return (
                <section key={g.id} className={`panel manager-grade${mine ? ' mine' : ''}`}>
                  <div className="manager-head">
                    <span className="manager-icon" aria-hidden="true">{g.icon}</span>
                    <h3>{g.name}</h3>
                  </div>
                  <p>
                    하루 월급 <b>{formatNumber(g.wage)} G</b>
                  </p>
                  <p>자동 수익 +{Math.round(g.incomeBonus * 100)}%</p>
                  <button
                    className="button primary full"
                    disabled={busy || paused || mine || !afford}
                    title={!afford && !mine ? '첫날 월급이 모자라요' : undefined}
                    onClick={() => void run(() => onHire(g.id))}
                  >
                    {mine ? '고용 중' : status.current ? '이 등급으로 바꾸기' : '고용하기'}
                  </button>
                </section>
              );
            })}
          </div>
          <p className="manager-note">월급은 내 시간당 최대 수익({formatNumber(status.hourlyIncome)} G)에 맞춰 정해져요. 첫날 월급은 고용할 때 바로 내고, 등급을 바꾸면 새 월급을 다시 내요.</p>
        </>
      )}
    </section>
  );
}
