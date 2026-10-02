import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

// 알림 종류별 켜기/끄기(푸시 알림과 화면 안의 알림 모두에 적용된다). 값이 없으면 켜진 것으로 본다.
@Schema({ _id: false })
export class NotificationPrefs {
  @Prop({ default: true })
  friendChat: boolean;

  @Prop({ default: true })
  mail: boolean;
}
export const NotificationPrefsSchema = SchemaFactory.createForClass(NotificationPrefs);

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true })
  googleId: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  displayName: string;

  @Prop()
  avatarUrl?: string;

  // 사용자가 직접 정한 표시 이름. 있으면 displayName(구글 프로필 이름) 대신 이걸 보여준다.
  // displayName은 구글 로그인 때마다 최신 구글 이름으로 덮어써지지만, nickname은 그대로 유지된다.
  @Prop({ trim: true, unique: true, sparse: true })
  nickname?: string;

  // 프로필에 보여주는 짧은 소개/상태 메시지. 무료이며 언제든 바꾸거나 지울 수 있다.
  @Prop({ trim: true, maxlength: 60 })
  profileMessage?: string;

  // 관리자 여부. 서버 관리 페이지 등 관리자 전용 기능 접근을 결정한다.
  @Prop({ default: false })
  isAdmin: boolean;

  // 채팅 정지가 풀리는 시각(ms). 지금보다 뒤면 정지 중이라 친구 채팅·공동 채팅방에 메시지를 보낼 수 없다(읽기는 가능).
  @Prop({ type: Number, default: null })
  chatBannedUntil: number | null;

  // 정지된 사유(신고 사유 이름). 정지가 풀리면 비운다.
  @Prop({ default: '' })
  chatBanReason: string;

  @Prop({ type: NotificationPrefsSchema, default: () => ({}) })
  notificationPrefs: NotificationPrefs;

  // @Schema({ timestamps: true })가 알아서 채워준다. 데코레이터 없이 타입 힌트만 선언한다.
  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
