import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { FortuneDrawResponse, FortuneStatus } from '../api/types';
import { formatDuration } from '../utils/gameCalc';

// 오늘의 운세: 하루 한 번 뽑으면 행운 계열과 소소한 효과가 정해져요. 7일 연속으로 뽑으면 보너스가 나와요.
export function FortuneView({ paused, onDraw }: { paused: boolean; onDraw: () => Promise<FortuneDrawResponse | null> }) {
  const [status, setStatus] = useState<FortuneStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        setStatus(await api.getFortune());
      } catch {
        setFailed(true);
      }
    });
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // 뽑는 동안 카드가 흔들리는 연출(0.7초)을 보여 준 뒤 결과를 펼친다
  const draw = async () => {
    if (drawing) return;
    setDrawing(true);
    const [r] = await Promise.all([onDraw(), new Promise<void>((resolve) => (timer.current = setTimeout(resolve, 700)))]);
    if (r) setStatus(r.status);
    setDrawing(false);
  };

  const f = status?.fortune ?? null;
  const filled = status ? (status.streak % status.streakEvery === 0 && status.streak > 0 ? status.streakEvery : status.streak % status.streakEvery) : 0;

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">DAILY FORTUNE</p>
          <h1>오늘의 운세</h1>
          <p className="subheading">하루 한 번 운세를 뽑아요. 행운 계열이 정해지고, 그날 자정까지 그 계열의 번식과 숲 탐색이 조금 좋아져요.</p>
        </div>
      </div>
      {failed && <p className="empty">운세를 불러오지 못했어요. 새로고침으로 다시 시도해 주세요.</p>}
      {!status && !failed && <p className="empty">점괘를 펼치는 중이에요…</p>}
      {status && (
        <>
          <section className={`panel fortune-card${drawing ? ' shaking' : ''}${f ? ` grade-${f.grade.id}` : ''}`}>
            {!f ? (
              <div className="fortune-ready">
                <span className="fortune-orb" aria-hidden="true">🔮</span>
                <p>오늘의 운세를 아직 뽑지 않았어요.</p>
                <button className="button primary" disabled={drawing || paused} onClick={() => void draw()}>
                  {drawing ? '점괘를 읽는 중…' : '운세 뽑기'}
                </button>
              </div>
            ) : (
              <div className="fortune-result">
                <span className="fortune-grade-icon" aria-hidden="true">{f.grade.icon}</span>
                <h2>오늘의 운세는 {f.grade.name}!</h2>
                <p className="fortune-line">“{f.line}”</p>
                <div className="fortune-chips">
                  <span className="weather-chip on">
                    {f.familyIcon} 행운 계열 {f.familyName}
                  </span>
                  <span className="weather-chip">
                    {f.color.icon} 행운의 색 {f.color.name}
                  </span>
                  <span className="weather-chip">🔢 행운의 숫자 {f.number}</span>
                </div>
                <p className="fortune-effects">
                  {f.familyIcon} {f.familyName} 계열 번식 <b>+{f.effects.breedPercent}%</b> · 숲 탐색·원정에서 {f.familyName} 계열 종 <b>×{f.effects.exploreMult}</b> — {formatDuration(status.resetsInMs / 1000)} 뒤 자정까지
                </p>
                <p className="fortune-reward">🎁 받은 선물 {f.rewardText}</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>📆 연속 뽑기</h2>
              <span className="pill">
                {status.streak}일 연속 · 최고 {status.best}일
              </span>
            </div>
            <div className="fortune-dots" aria-label={`${status.streakEvery}일 중 ${filled}일`}>
              {Array.from({ length: status.streakEvery }, (_, i) => (
                <span key={i} className={i < filled ? 'on' : ''} />
              ))}
            </div>
            <p className="fortune-note">
              {status.drawn ? `내일도 뽑으면 ${status.streak + 1}일 연속이에요. ` : status.streak > 0 ? `오늘 뽑으면 ${status.streak + 1}일 연속이에요. ` : ''}
              {status.streakEvery}일 연속마다 보너스 <b>{status.streakBonusText}</b> — 다음 보너스까지 {status.nextBonusIn}일.
            </p>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>🎴 운세 등급</h2>
            </div>
            <ul className="fortune-grades">
              {status.grades.map((g) => (
                <li key={g.id} className={f?.grade.id === g.id ? 'mine' : ''}>
                  <span>
                    {g.icon} {g.name}
                  </span>
                  <span>{g.rate}%</span>
                  <span>{g.rewardText}</span>
                  <span>
                    번식 +{g.breedPercent}% · 탐색 ×{g.exploreMult}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </section>
  );
}
