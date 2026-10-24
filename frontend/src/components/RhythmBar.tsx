import { useEffect, useRef } from 'react';
import { markerPosition, rhythmAccuracy, rhythmBonusPercent, RHYTHM_MAX_BONUS } from '../utils/rhythmStrike';

// 리듬 일격 타이밍 바. 마커가 좌우로 오가고, '지금!'을 누르거나 바를 누르면(스페이스·엔터도) 그 순간의 위치로 정확도를 정한다.
export function RhythmBar({ onStop, onCancel }: { onStop: (accuracy: number) => void; onCancel: () => void }) {
  const startRef = useRef(0);
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    startRef.current = performance.now();
    let raf = 0;
    const tick = () => {
      if (markerRef.current) markerRef.current.style.left = `${markerPosition(performance.now() - startRef.current) * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const stop = () => onStop(rhythmAccuracy(markerPosition(performance.now() - startRef.current)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        onStop(rhythmAccuracy(markerPosition(performance.now() - startRef.current)));
      } else if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStop, onCancel]);

  return (
    <div className="rhythm-bar" role="group" aria-label="리듬 일격 타이밍 바">
      <p className="rhythm-help">
        💥 마커가 <b>가운데</b>에 올 때 멈추세요! 가운데일수록 일격 피해 +{Math.round(RHYTHM_MAX_BONUS * 100)}%, 끝일수록 −{Math.round(RHYTHM_MAX_BONUS * 100)}% (스페이스·엔터로도 멈출 수 있어요)
      </p>
      <div className="rhythm-track" onPointerDown={stop} data-testid="rhythm-track">
        <span className="rhythm-zone rhythm-zone-good" />
        <span className="rhythm-zone rhythm-zone-perfect" />
        <span className="rhythm-marker" ref={markerRef} />
      </div>
      <div className="rhythm-actions">
        <button className="button primary" onClick={stop} autoFocus>
          지금!
        </button>
        <button className="button secondary" onClick={onCancel}>
          취소
        </button>
        <small>
          {rhythmBonusPercent(1) > 0 ? `완벽 +${rhythmBonusPercent(1)}%` : ''} · 무난 0% · 아쉬움 {rhythmBonusPercent(0)}%
        </small>
      </div>
    </div>
  );
}
