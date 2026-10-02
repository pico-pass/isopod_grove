import { Injectable, OnModuleDestroy } from '@nestjs/common';

// 이 시간 안에 인증된 요청이 있었으면 "접속 중"으로 본다. 게임 틱(5초)·채팅 폴링(4초)이
// 계속 도는 동안은 자연히 이 안에 들어오고, 탭을 닫으면 곧 범위를 벗어난다.
const ONLINE_THRESHOLD_MS = 60_000;
const SWEEP_INTERVAL_MS = 5 * 60_000;
const STALE_AFTER_MS = 30 * 60_000;

@Injectable()
export class PresenceService implements OnModuleDestroy {
  // 유저별 마지막 요청 시각. 서버 재시작 시 초기화돼도 괜찮은 가벼운 접속 감지용이라 메모리에만 둔다.
  private readonly lastSeenAt = new Map<string, number>();
  private readonly sweepTimer: NodeJS.Timeout;

  constructor() {
    this.sweepTimer = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS);
  }

  touch(userId: string) {
    this.lastSeenAt.set(userId, Date.now());
  }

  isOnline(userId: string): boolean {
    const at = this.lastSeenAt.get(userId);
    return at !== undefined && Date.now() - at <= ONLINE_THRESHOLD_MS;
  }

  getOnlineUserIds(): string[] {
    const now = Date.now();
    const ids: string[] = [];
    for (const [userId, at] of this.lastSeenAt.entries()) {
      if (now - at <= ONLINE_THRESHOLD_MS) ids.push(userId);
    }
    return ids;
  }

  // 오래 접속하지 않은 유저 기록을 메모리에서 정리한다(무한정 쌓이지 않게).
  private sweep() {
    const now = Date.now();
    for (const [userId, at] of this.lastSeenAt.entries()) {
      if (now - at > STALE_AFTER_MS) this.lastSeenAt.delete(userId);
    }
  }

  onModuleDestroy() {
    clearInterval(this.sweepTimer);
  }
}
