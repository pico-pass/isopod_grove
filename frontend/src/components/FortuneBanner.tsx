import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { FortuneStatus } from '../api/types';

// 오늘의 운세를 아직 안 뽑았을 때만 뜨는 한 줄 안내(뽑았거나 불러오지 못하면 아무것도 그리지 않는다).
export function FortuneBanner({ onOpen }: { onOpen?: () => void }) {
  const [status, setStatus] = useState<FortuneStatus | null>(null);

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        setStatus(await api.getFortune());
      } catch {
        // 배너는 없어도 되는 정보라 무시한다
      }
    });
  }, []);

  if (!status || status.drawn) return null;
  return (
    <div className="fortune-banner" role="status" aria-label="오늘의 운세">
      <span className="seasonal-icon">🔮</span>
      <div className="seasonal-main">
        <strong>오늘의 운세를 아직 안 뽑았어요</strong>
        <div className="seasonal-chips">
          <span className="weather-chip on">{status.streak > 0 ? `${status.streak}일 연속 중` : '하루 한 번 무료'}</span>
          <span className="weather-chip">행운 계열 번식·탐색 보너스</span>
        </div>
      </div>
      {onOpen && (
        <button className="button secondary" onClick={onOpen}>
          뽑으러 가기
        </button>
      )}
    </div>
  );
}
