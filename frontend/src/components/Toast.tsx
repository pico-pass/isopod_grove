import { useEffect } from 'react';
import type { ToastState } from '../hooks/useGameEngine';

export function Toast({ toast }: { toast: ToastState | null }) {
  useEffect(() => {
    // 토스트는 key가 바뀔 때마다 자동으로 다시 나타남 (CSS 애니메이션이 재시작됨)
  }, [toast?.key]);

  if (!toast) return null;
  return (
    <div className="toast-region" role="status" aria-live="polite">
      <div key={toast.key} className={`toast${toast.error ? ' error' : ''}`}>
        {toast.message}
      </div>
    </div>
  );
}
