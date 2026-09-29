import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

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

  // 관리자 여부. 서버 관리 페이지 등 관리자 전용 기능 접근을 결정한다.
  @Prop({ default: false })
  isAdmin: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
