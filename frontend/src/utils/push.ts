import { api } from '../api/client';

const SW_URL = '/sw.js';

// 'unsupported' 이 브라우저는 푸시를 못 씀 / 'unavailable' 서버에 푸시 설정이 없음 / 'denied' 알림 권한이 차단됨
export type PushStatus = 'unsupported' | 'unavailable' | 'denied' | 'off' | 'on';

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// 서버가 주는 공개 키(base64url)를 브라우저가 요구하는 바이트 배열로 바꾼다.
function keyToBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration(SW_URL);
  return reg ? reg.pushManager.getSubscription() : null;
}

function toServerSubscription(sub: PushSubscription) {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('브라우저가 푸시 구독 정보를 만들지 못했어요.');
  }
  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!isPushSupported()) return 'unsupported';
  const config = await api.getPushConfig().catch(() => null);
  if (!config?.enabled) return 'unavailable';
  if (Notification.permission === 'denied') return 'denied';
  return (await currentSubscription()) ? 'on' : 'off';
}

// 알림 권한을 요청하고 이 기기를 서버에 등록한다. 버튼을 누른 직후(사용자 동작 안)에서 불러야 한다.
export async function enablePush(): Promise<PushStatus> {
  if (!isPushSupported()) return 'unsupported';
  const config = await api.getPushConfig();
  if (!config.enabled || !config.publicKey) return 'unavailable';
  const permission = await Notification.requestPermission();
  if (permission === 'denied') return 'denied';
  if (permission !== 'granted') return 'off';

  const reg = await navigator.serviceWorker.register(SW_URL);
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(config.publicKey) }));
  await api.subscribePush(toServerSubscription(sub));
  return 'on';
}

// 서버와 이 브라우저에서 모두 구독을 해제한다.
export async function disablePush(): Promise<PushStatus> {
  if (!isPushSupported()) return 'unsupported';
  const sub = await currentSubscription();
  if (sub) {
    await api.unsubscribePush(sub.endpoint).catch(() => {});
    await sub.unsubscribe();
  }
  return 'off';
}

// 로그인할 때: 이 브라우저에 이미 구독이 있으면 지금 로그인한 유저로 서버에 다시 등록한다
// (브라우저가 키를 바꿨거나, 서버 기록이 없어졌을 때를 맞춘다). 구독이 없으면 아무것도 하지 않는다.
export async function syncPushSubscription(): Promise<void> {
  if (!isPushSupported() || Notification.permission !== 'granted') return;
  try {
    const sub = await currentSubscription();
    if (sub) await api.subscribePush(toServerSubscription(sub));
  } catch {
    // 알림은 부가 기능이라 조용히 넘어간다.
  }
}

// 로그아웃할 때: 이 기기가 다음에 로그인하는 다른 사람의 알림을 받지 않도록 구독을 정리한다.
export async function releasePushOnLogout(): Promise<void> {
  try {
    await disablePush();
  } catch {
    // 로그아웃은 막지 않는다.
  }
}
