import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as webpush from 'web-push';
import { NotificationCategory, UsersService } from '../users/users.service';
import {
  PushSubscription,
  PushSubscriptionDocument,
} from './schemas/push-subscription.schema';

const MAX_DEVICES_PER_USER = 10; // 한 유저가 등록할 수 있는 기기 수(넘으면 가장 오래된 것부터 지운다)
const SEND_CONCURRENCY = 20;
const PUSH_TTL_SECONDS = 60 * 60; // 기기가 꺼져 있어도 이 시간 안에 켜지면 전달한다

export interface PushPayload {
  title: string;
  body: string;
  // 알림을 누르면 열 화면(친구, 우편함 등). 프론트의 ViewKey와 같은 값이다.
  view?: string;
  // 같은 tag의 알림은 서로 대체된다(같은 친구가 연달아 보내면 마지막 것만 남게).
  tag?: string;
}

export interface PushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// 실제 전송을 담당하는 얇은 어댑터. 테스트에서는 이걸 갈아 끼워서 네트워크 없이 검증한다.
export interface PushTransport {
  send(target: PushTarget, payload: string, options: { TTL: number; urgency: 'low' | 'normal' | 'high' }): Promise<unknown>;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  publicKey: string | null = null;
  transport: PushTransport | null = null;

  constructor(
    @InjectModel(PushSubscription.name)
    private subscriptionModel: Model<PushSubscriptionDocument>,
    config: ConfigService,
    // 알림 종류별 설정(끈 유저는 건너뛴다)에 쓴다. 없으면 설정과 상관없이 보낸다.
    private readonly usersService?: UsersService,
  ) {
    const publicKey = config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = config.get<string>('VAPID_PRIVATE_KEY');
    const subject = config.get<string>('VAPID_SUBJECT') ?? 'https://isopogrove.click';
    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.publicKey = publicKey;
      this.transport = {
        send: (target, payload, options) => webpush.sendNotification(target, payload, options),
      };
    } else {
      this.logger.warn('VAPID 키가 없어 푸시 알림이 꺼져 있어요. (.env의 VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)');
    }
  }

  get enabled(): boolean {
    return !!this.transport && !!this.publicKey;
  }

  getConfig() {
    return { enabled: this.enabled, publicKey: this.enabled ? this.publicKey : null };
  }

  // 기기를 등록한다. 같은 endpoint가 이미 있으면(같은 브라우저에서 계정을 바꾼 경우) 지금 유저로 넘긴다.
  async subscribe(userId: string, target: PushTarget, userAgent = '') {
    if (!this.enabled) {
      throw new ServiceUnavailableException('지금은 푸시 알림을 사용할 수 없어요.');
    }
    const uid = new Types.ObjectId(userId);
    await this.subscriptionModel.updateOne(
      { endpoint: target.endpoint },
      {
        $set: { userId: uid, p256dh: target.keys.p256dh, auth: target.keys.auth, userAgent: userAgent.slice(0, 200) },
        $setOnInsert: { createdAt: Date.now() },
      },
      { upsert: true },
    );
    const mine = await this.subscriptionModel.find({ userId: uid }, { _id: 1 }).sort({ createdAt: 1 }).lean();
    const excess = mine.length - MAX_DEVICES_PER_USER;
    if (excess > 0) {
      await this.subscriptionModel.deleteMany({ _id: { $in: mine.slice(0, excess).map((m) => m._id) } });
    }
    return { ok: true };
  }

  // 내 구독만 지울 수 있다(남의 endpoint를 알아도 지울 수 없다).
  async unsubscribe(userId: string, endpoint: string) {
    await this.subscriptionModel.deleteOne({ endpoint, userId: new Types.ObjectId(userId) });
    return { ok: true };
  }

  // 한 유저의 모든 기기로 보낸다. 푸시는 "있으면 좋은" 부가 기능이라 어떤 실패도 호출한 쪽으로 던지지 않는다.
  async sendToUser(userId: string, payload: PushPayload, category?: NotificationCategory): Promise<number> {
    return this.sendToUsers([userId], payload, category);
  }

  // category를 주면 그 종류의 알림을 꺼 둔 유저는 뺀다(친구 메시지·우편 등).
  async sendToUsers(userIds: string[], payload: PushPayload, category?: NotificationCategory): Promise<number> {
    if (!this.transport || userIds.length === 0) return 0;
    try {
      let targets = userIds.filter((id) => Types.ObjectId.isValid(id));
      if (category && this.usersService) {
        const optedOut = await this.usersService.findNotificationOptOuts(targets, category);
        targets = targets.filter((id) => !optedOut.has(id));
      }
      if (targets.length === 0) return 0;
      const ids = targets.map((id) => new Types.ObjectId(id));
      const subs = await this.subscriptionModel.find({ userId: { $in: ids } }).lean();
      return await this.deliver(subs, payload);
    } catch (e) {
      this.logger.warn(`푸시 발송 중 오류: ${e instanceof Error ? e.message : String(e)}`);
      return 0;
    }
  }

  private async deliver(
    subs: { _id: Types.ObjectId; endpoint: string; p256dh: string; auth: string }[],
    payload: PushPayload,
  ): Promise<number> {
    const transport = this.transport;
    if (!transport) return 0;
    const body = JSON.stringify(payload);
    let sent = 0;
    for (let i = 0; i < subs.length; i += SEND_CONCURRENCY) {
      await Promise.all(
        subs.slice(i, i + SEND_CONCURRENCY).map(async (s) => {
          try {
            await transport.send({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
              TTL: PUSH_TTL_SECONDS,
              urgency: 'normal',
            });
            sent++;
          } catch (e) {
            const status = (e as { statusCode?: number }).statusCode;
            // 구독이 만료됐거나 브라우저에서 해제된 경우(404/410)는 더 보내지 않도록 지운다.
            if (status === 404 || status === 410) {
              await this.subscriptionModel.deleteOne({ _id: s._id });
            } else {
              this.logger.warn(`푸시 전송 실패(${status ?? '알 수 없음'}): ${e instanceof Error ? e.message : String(e)}`);
            }
          }
        }),
      );
    }
    return sent;
  }
}
