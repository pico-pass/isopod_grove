import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AchievementDocument = HydratedDocument<Achievement>;

export type AchievementType = 'stat' | 'collectionRarity' | 'collectionAll';

// 진행도를 재는 기준. discovered/terrariums는 population 시딩이 아니라 계정 자체에서 읽는다.
// friendsCount는 친구 관계 수, nicknames는 지어준 콩벌레 별명 수를 그때그때 조회해서 쓴다.
// equipment* 중 equipmentPulls만 누적 카운터이고, 나머지는 보유 장비에서 그때그때 계산한다
// (장비는 사라지지 않고 레벨·각성·슬롯도 줄지 않아서 "한 번이라도 달성" 조건으로 안전하다).
export type AchievementStatKey =
  | 'births'
  | 'sold'
  | 'explored'
  | 'earned'
  | 'discovered'
  | 'terrariums'
  | 'battlesWon'
  | 'pvpWins'
  | 'peakPvpRating'
  | 'trainCount'
  | 'highestBattleLevel'
  | 'friendsCount'
  | 'nicknames'
  | 'equipmentPulls'
  | 'equipmentOwned'
  | 'legendEquipment'
  | 'mythicEquipment'
  | 'equipmentLevel'
  | 'equipmentAwakenings'
  | 'equipmentSlots';

@Schema({ collection: 'achievements' })
export class Achievement {
  @Prop({ required: true, unique: true })
  achievementId: string;

  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  icon: string;

  @Prop({ required: true })
  type: AchievementType;

  // type === 'stat'일 때만 사용
  @Prop()
  statKey?: AchievementStatKey;

  @Prop()
  target?: number;

  // type === 'collectionRarity'일 때만 사용 (0~4)
  @Prop()
  rarity?: number;

  @Prop({ required: true, min: 0 })
  reward: number;

  // 완료 시 G 보상과 별도로 지급하는 숲 탐색권 개수(없으면 0장)
  @Prop({ default: 0, min: 0 })
  ticketReward: number;

  // 완료 시 G 보상과 별도로 지급하는 다이아 개수(없으면 0개)
  @Prop({ default: 0, min: 0 })
  diamondReward: number;
}

export const AchievementSchema = SchemaFactory.createForClass(Achievement);
