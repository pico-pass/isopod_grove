// 푸시 알림 서비스 워커.
// 앱 창이 화면에 보이고 포커스가 있을 땐 알림을 띄우지 않는다(이미 화면에서 보고 있으니까). 그 외에는 항상 띄운다.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'ISOPOD GROVE', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'ISOPOD GROVE';
  const options = {
    body: data.body || '',
    icon: '/assets/isopod.png',
    badge: '/assets/isopod.png',
    // 같은 tag의 알림은 서로 대체된다(같은 친구가 연달아 보내면 마지막 것만 남는다). renotify로 새로 울리게 한다.
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { view: data.view || '' },
  };
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (windows.some((w) => w.visibilityState === 'visible' && w.focused)) return;
      await self.registration.showNotification(title, options);
    })(),
  );
});

// 알림을 누르면 열려 있는 창으로 이동하고(없으면 새로 열고), 해당 화면(친구·우편함 등)으로 보낸다.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const view = (event.notification.data && event.notification.data.view) || '';
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const w of windows) {
        if ('focus' in w) {
          await w.focus();
          w.postMessage({ type: 'navigate', view });
          return;
        }
      }
      await self.clients.openWindow(view ? `/#${view}` : '/');
    })(),
  );
});
