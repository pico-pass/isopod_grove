import { useEffect, useState } from 'react';
import { disablePush, enablePush, getPushStatus, type PushStatus } from '../utils/push';

// 푸시 알림 켜기/끄기. 이 브라우저(기기)에만 적용된다.
export function PushToggle({ showToast }: { showToast: (message: string, isError?: boolean) => void }) {
  const [status, setStatus] = useState<PushStatus | 'loading'>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(getPushStatus)
      .then((s) => !cancelled && setStatus(s))
      .catch(() => !cancelled && setStatus('unavailable'));
    return () => {
      cancelled = true;
    };
  }, []);

  const run = async (action: () => Promise<PushStatus>, doneMessage: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const next = await action();
      setStatus(next);
      if (next === 'on' || doneMessage.includes('껐')) showToast(doneMessage);
    } catch (e) {
      showToast(e instanceof Error ? e.message : '푸시 알림 설정에 실패했어요.', true);
    } finally {
      setBusy(false);
    }
  };

  // 서버에 푸시 설정이 없거나 아직 확인 중이면 보여주지 않는다.
  if (status === 'loading' || status === 'unavailable') return null;

  return (
    <div className="push-toggle">
      {status === 'unsupported' && (
        <small>이 브라우저는 푸시 알림을 지원하지 않아요. (iPhone은 홈 화면에 추가한 뒤 사용할 수 있어요)</small>
      )}
      {status === 'denied' && (
        <small>🔕 알림이 차단돼 있어요. 브라우저 주소창의 사이트 설정에서 알림을 허용해 주세요.</small>
      )}
      {status === 'off' && (
        <>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void run(enablePush, '🔔 푸시 알림을 켰어요. 친구 메시지와 우편이 오면 알려드릴게요.')}
          >
            🔔 푸시 알림 켜기
          </button>
          <small>친구 메시지·우편이 오면 이 기기로 알려드려요.</small>
        </>
      )}
      {status === 'on' && (
        <>
          <span className="push-on">🔔 푸시 알림 켜짐</span>
          <button className="button secondary" disabled={busy} onClick={() => void run(disablePush, '🔕 푸시 알림을 껐어요.')}>
            끄기
          </button>
        </>
      )}
    </div>
  );
}
