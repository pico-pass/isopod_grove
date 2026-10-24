import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { SkillLabResponse, SkillLabStatus } from '../api/types';
import { formatNumber } from '../utils/gameCalc';

// 계열 기술 연구소: 불꽃·숲·서리 계열마다 직접 전투의 계열 기술(불길·뿌리 감기·빙결)을 강하게 하는 연구 트리예요. 골드와 다이아로 올리고, 올리면 바로 적용돼요.
export function SkillLabView({
  coins,
  diamonds,
  paused,
  onUpgrade,
}: {
  coins: number;
  diamonds: number;
  paused: boolean;
  onUpgrade: (id: string) => Promise<SkillLabResponse | null>;
}) {
  const [status, setStatus] = useState<SkillLabStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        setStatus(await api.getSkillLab());
      } catch {
        setFailed(true);
      }
    });
  }, []);

  const upgrade = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await onUpgrade(id);
      if (r) setStatus(r.status);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">SKILL LAB</p>
          <h1>
            계열 기술 연구소 <span>보유 {formatNumber(coins)} G · 💎 {formatNumber(diamonds)}</span>
          </h1>
          <p className="subheading">직접 전투에서 쓰는 계열 기술을 연구로 강하게 해요. 그 계열 식구가 쓰는 기술에만 적용되고, 야생 배틀·보스 타워·서바이벌·던전·현상수배 모두에서 효과가 나요.</p>
        </div>
      </div>
      {failed && <p className="empty">연구 현황을 불러오지 못했어요. 새로고침으로 다시 시도해 주세요.</p>}
      {!status && !failed && <p className="empty">연구소를 여는 중이에요…</p>}
      {status && (
        <div className="skilllab-grid">
          {status.families.map((f) => (
            <section key={f.family} className={`panel skilllab-family family-${f.family}`}>
              <div className="panel-heading">
                <h2>
                  {f.icon} {f.name} 계열
                </h2>
                <span className="pill">{f.skillName}</span>
              </div>
              <ul>
                {f.nodes.map((n) => {
                  const afford = !!n.next && coins >= n.next.gold && diamonds >= n.next.diamonds;
                  return (
                    <li key={n.id} className={n.level >= n.max ? 'maxed' : ''}>
                      <span className="dungeon-supply-icon">{n.icon}</span>
                      <span className="dungeon-supply-info">
                        <strong>
                          {n.name} <small>Lv.{n.level}/{n.max}</small>
                        </strong>
                        <small>{n.desc}</small>
                      </span>
                      {n.next ? (
                        <>
                          <span className="dungeon-supply-price">
                            {formatNumber(n.next.gold)} G · 💎 {n.next.diamonds}
                          </span>
                          <button className="button secondary" disabled={busy || paused || !afford} title={afford ? undefined : '골드나 다이아가 부족해요'} onClick={() => void upgrade(n.id)}>
                            연구
                          </button>
                        </>
                      ) : (
                        <span className="dungeon-supply-price">최고 단계</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
