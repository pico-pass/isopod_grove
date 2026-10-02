import { Type } from 'class-transformer';
import { IsBoolean, IsObject, IsOptional, IsString, IsUrl, MaxLength, ValidateNested } from 'class-validator';

export class PushKeysDto {
  @IsString()
  @MaxLength(200)
  p256dh: string;

  @IsString()
  @MaxLength(100)
  auth: string;
}

export class SubscribePushDto {
  // 푸시 서비스 주소는 항상 https다.
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(1000)
  endpoint: string;

  // ValidateNested만으로는 keys가 아예 없을 때 통과하므로 IsObject로 먼저 막는다.
  @IsObject()
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;
}

export class UnsubscribePushDto {
  @IsString()
  @MaxLength(1000)
  endpoint: string;
}

// 알림 종류별 켜기/끄기. 보낸 항목만 바꾼다.
export class UpdateNotificationPrefsDto {
  @IsOptional()
  @IsBoolean()
  friendChat?: boolean;

  @IsOptional()
  @IsBoolean()
  mail?: boolean;
}
