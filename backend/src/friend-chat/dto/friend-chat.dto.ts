import { IsBoolean, IsIn, IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { FRIEND_MESSAGE_MAX_LENGTH } from '../schemas/friend-message.schema';
import { REPORT_REASONS } from '../schemas/friend-chat-report.schema';

export const CHAT_BAN_MAX_DAYS = 365;

export class FriendIdParamDto {
  @IsMongoId()
  friendId: string;
}

export class FriendMessageParamDto extends FriendIdParamDto {
  @IsMongoId()
  messageId: string;
}

export class GetFriendMessagesDto {
  // 이 id 이후의 메시지만 가져온다. 없으면 최근 메시지 목록을 가져온다.
  @IsOptional()
  @IsMongoId()
  after?: string;
}

export class SendFriendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(FRIEND_MESSAGE_MAX_LENGTH)
  text: string;
}

export class ReportFriendMessageDto {
  @IsMongoId()
  messageId: string;

  @IsIn(REPORT_REASONS)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  detail?: string;
}

export class ResolveReportDto {
  // resolved: 확인 후 조치/처리함, dismissed: 문제 없음으로 반려
  @IsIn(['resolved', 'dismissed'])
  status: 'resolved' | 'dismissed';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  adminNote?: string;

  // 처리 완료(resolved)일 때만 붙일 수 있는 채팅 정지 일수. 생략하거나 0이면 정지하지 않는다.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(CHAT_BAN_MAX_DAYS)
  banDays?: number;

  // 정지를 걸 때 그 유저에게 안내 우편을 보낼지(생략하면 보낸다)
  @IsOptional()
  @IsBoolean()
  notify?: boolean;
}

export class ListReportsDto {
  @IsOptional()
  @IsIn(['open', 'handled', 'all'])
  status?: 'open' | 'handled' | 'all';
}

export class ReportIdParamDto {
  @IsMongoId()
  reportId: string;
}

export class UserIdParamDto {
  @IsMongoId()
  userId: string;
}
