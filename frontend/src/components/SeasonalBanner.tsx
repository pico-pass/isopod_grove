import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { SeasonalStatus } from '../api/types';
import { FAMILY_LABELS } from '../utils/decor';

// 지금 열려 있는 계절 이벤트를 한 줄로 알린다(없으면 아무것도 그리지 않는다). 불러오지 못해도 조용히 넘어간다.
export function SeasonalBanner({ onOpen }: { onOpen?: () => void }) {
  const [status, setStatus] = useState<SeasonalStatus | null>(null);

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        setStatus(await api.getSeasonal());
      } catch {
        // 배너는 없어도 되는 정보라 무시한다
      }
    });
  }, []);

  if (!status || status.active.length === 0) return null;
  return (
    <div className="seasonal-banners">
      {status.active.map((e) => (
        <div key={e.id} className={`seasonal-banner family-${e.family}`} role="status" aria-label={`${e.name} 이벤트`}>
          <span className="seasonal-icon">{e.icon}</span>
          <div className="seasonal-main">
            <strong>
              {e.name} 이벤트 <small>{e.daysLeft}일 남음</small>
            </strong>
            <div className="seasonal-chips">
              <span className="weather-chip on">
                {FAMILY_LABELS[e.family].icon} {FAMILY_LABELS[e.family].name} 계열 탐색 ×{e.exploreWeight}
              </span>
              <span className="weather-chip">🎫 한정 장식</span>
              {!e.giftClaimed && <span className="weather-chip on">🎁 선물 대기 중</span>}
            </div>
          </div>
          {onOpen && (
            <button className="button secondary" onClick={onOpen}>
              보러 가기
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
