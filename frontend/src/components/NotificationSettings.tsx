import type { NotificationPrefs } from '../api/types';
import { PushToggle } from './PushToggle';

const CATEGORIES: { key: keyof NotificationPrefs; icon: string; label: string; description: string }[] = [
  { key: 'friendChat', icon: '💬', label: '친구 메시지', description: '친구가 메시지를 보냈을 때' },
  { key: 'mail', icon: '📬', label: '우편', description: '운영자의 보상·공지 우편이 왔을 때' },
];

// 알림 설정. 위쪽은 이 기기의 푸시 알림 켜기/끄기, 아래쪽은 알림 종류별 켜기/끄기(계정 전체에 적용)다.
export function NotificationSettings({
  prefs,
  onChange,
  showToast,
}: {
  prefs: NotificationPrefs;
  onChange: (patch: Partial<NotificationPrefs>) => void;
  showToast: (message: string, isError?: boolean) => void;
}) {
  return (
    <section className="notification-settings">
      <h3>🔔 알림 설정</h3>
      <PushToggle showToast={showToast} />
      <div className="notification-categories">
        {CATEGORIES.map((c) => (
          <label key={c.key} className="notification-row">
            <input type="checkbox" checked={prefs[c.key]} onChange={(e) => onChange({ [c.key]: e.target.checked })} />
            <span>
              <strong>
                {c.icon} {c.label}
              </strong>
              <small>{c.description}</small>
            </span>
          </label>
        ))}
      </div>
      <small className="notification-note">
        끄면 해당 알림이 푸시 알림과 화면 안의 알림으로 오지 않아요. (안 읽은 수 표시는 계속 보여요)
      </small>
    </section>
  );
}
