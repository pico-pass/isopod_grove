// 접속했을 때 한 번 띄우는 홍보 팝업. 새 홍보를 하려면 PROMO_POPUPS에 항목을 하나 추가하면 된다(id가 달라야 따로 닫힌다).
//   - 닫기: 이번 접속에서만 닫는다(다시 접속하면 또 뜬다).
//   - 24시간 동안 닫기: 이 브라우저에서 이 계정은 24시간 동안 이 팝업을 보지 않는다.
//   - endsAt이 지나면 더 이상 뜨지 않는다.
export interface PromoPopup {
  id: string;
  endsAt: string; // ISO 시각. 이 시각이 지나면 팝업을 끝낸다.
  title: string;
  subtitle: string;
  speciesIds: string[]; // 보여줄 종(희귀도 높은 순으로 그린다). 목록에 없는 종은 건너뛴다.
}

export const SNOOZE_HOURS = 24;

export const PROMO_POPUPS: PromoPopup[] = [
  {
    id: 'new-species-2026-10-19',
    endsAt: '2026-11-02T23:59:59+09:00',
    title: '새 콩벌레 5종 등장!',
    subtitle: '숲 탐색과 원정에서 만날 수 있어요',
    speciesIds: ['albomarginatum', 'latte', 'milkyEdge', 'ibericum', 'muricatum'],
  },
];

const storageKey = (userId: string, popupId: string) => `isopod-promo-snooze-${userId}-${popupId}`;

// 24시간 동안 닫기를 눌러 둔 팝업인지(저장소를 못 읽으면 닫지 않은 것으로 본다)
export function isPromoSnoozed(userId: string, popupId: string, now = Date.now()): boolean {
  try {
    const until = Number(localStorage.getItem(storageKey(userId, popupId)));
    return Number.isFinite(until) && until > now;
  } catch {
    return false;
  }
}

export function snoozePromo(userId: string, popupId: string, now = Date.now(), hours = SNOOZE_HOURS): void {
  try {
    localStorage.setItem(storageKey(userId, popupId), String(now + hours * 3_600_000));
  } catch {
    // 저장하지 못하면 다음 접속에 다시 뜰 뿐이다.
  }
}

// 지금 띄울 팝업(없으면 null). 끝났거나 24시간 닫기 중인 것은 건너뛴다.
export function pickActivePromo(userId: string, now = Date.now(), popups: readonly PromoPopup[] = PROMO_POPUPS): PromoPopup | null {
  return popups.find((p) => Date.parse(p.endsAt) > now && !isPromoSnoozed(userId, p.id, now)) ?? null;
}
