import {
  ArrayMaxSize,
  IsBoolean,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

// 관리자가 한 번에 보낼 수 있는 한도. 실수로 0을 하나 더 붙여도 경제가 무너지지 않게 상한을 둔다.
export const MAIL_MAX_COINS = 1_000_000_000;
export const MAIL_MAX_DIAMONDS = 100_000;
export const MAIL_MAX_TICKETS = 1_000;
export const MAIL_MAX_USERS = 200; // 선택한 유저에게 보낼 때의 최대 인원(전체 발송은 이 제한이 없다)
export const MAIL_DEFAULT_EXPIRE_DAYS = 30;
export const MAIL_MAX_EXPIRE_DAYS = 90;
export const MAIL_TITLE_MAX = 40;
export const MAIL_BODY_MAX = 500;

export class AdminSendMailDto {
  // all: 가입한 모든 유저, users: userIds로 고른 유저만
  @IsIn(['all', 'users'])
  target: 'all' | 'users';

  @ValidateIf((o: AdminSendMailDto) => o.target === 'users')
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAIL_MAX_USERS)
  @IsMongoId({ each: true })
  userIds?: string[];

  @IsString()
  @MinLength(1)
  @MaxLength(MAIL_TITLE_MAX)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAIL_BODY_MAX)
  body?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAIL_MAX_COINS)
  coins?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAIL_MAX_DIAMONDS)
  diamonds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAIL_MAX_TICKETS)
  explorationTickets?: number;

  // 받는 유저의 기기로 푸시 알림도 보낼지. 생략하면 보낸다(푸시를 켜 둔 유저에게만 간다).
  @IsOptional()
  @IsBoolean()
  push?: boolean;

  // 우편이 유지되는 기간(일). 지나면 받지 않은 자원도 함께 사라진다.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAIL_MAX_EXPIRE_DAYS)
  expireDays?: number;
}
