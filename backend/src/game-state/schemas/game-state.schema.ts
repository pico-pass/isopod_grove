import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type GameStateDocument = HydratedDocument<GameState>;

@Schema({ _id: false })
export class DailyProgress {
  @Prop({ required: true })
  day: string;

  @Prop({ default: 0 })
  feed: number;

  @Prop({ default: 0 })
  observe: number;

  @Prop({ default: 0 })
  births: number;

  @Prop({ default: 0 })
  explore: number;

  // 오늘 쓴 보스 타워 도전 횟수(승패 무관). 날짜가 바뀌면 daily 전체가 새로 만들어지며 0으로 돌아간다.
  @Prop({ default: 0 })
  bossAttempts: number;

  @Prop({ type: [String], default: [] })
  claimed: string[];
}
export const DailyProgressSchema = SchemaFactory.createForClass(DailyProgress);

@Schema({ _id: false })
export class Stats {
  @Prop({ default: 0 })
  births: number;

  @Prop({ default: 0 })
  sold: number;

  @Prop({ default: 0 })
  earned: number;

  @Prop({ default: 0 })
  explored: number;

  @Prop({ default: 0 })
  played: number;

  @Prop({ default: 0 })
  battlesWon: number;

  @Prop({ default: 0 })
  battlesLost: number;

  @Prop({ default: 0 })
  pvpWins: number;

  @Prop({ default: 0 })
  pvpLosses: number;

  // 전투 훈련(train) 성공 누적 횟수. 업적 조건으로 쓴다.
  @Prop({ default: 0 })
  trainCount: number;

  // 지금까지 도달한 투기장 레이팅 중 가장 높은 값. 레이팅은 오르내리지만
  // 이 값은 한번 오르면 내려가지 않아 업적 조건(한 번이라도 달성)으로 쓰기 좋다.
  @Prop({ default: 0 })
  peakPvpRating: number;

  // 보유 종 중 가장 높이 올린 전투 레벨. 야생 배틀/훈련/투기장 어디서 올려도 갱신된다.
  @Prop({ default: 0 })
  highestBattleLevel: number;

  // 장비 뽑기 누적 횟수(10연차는 10회로 센다). 업적 조건으로 쓴다.
  @Prop({ default: 0 })
  equipmentPulls: number;

  // 보스 타워에서 깬 가장 높은 층. 한 번 오르면 내려가지 않는다. 다음 도전 가능 층(= 이 값 + 1)과 업적·랭킹에 쓴다.
  @Prop({ default: 0 })
  highestBossFloor: number;

  // 보스 타워 승리 누적 횟수(이미 깬 층을 다시 이긴 것도 센다)
  @Prop({ default: 0 })
  bossWins: number;
}
export const StatsSchema = SchemaFactory.createForClass(Stats);

@Schema({ _id: false })
export class LogEntry {
  @Prop({ required: true })
  at: number;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  text: string;
}
export const LogEntrySchema = SchemaFactory.createForClass(LogEntry);

// 사육장 하나. 환경(먹이/습도/온도)과 식구·번식 진행이 사육장마다 따로 관리된다.
@Schema({
  _id: false,
  toJSON: { flattenMaps: true },
  toObject: { flattenMaps: true },
})
export class Terrarium {
  @Prop({ required: true })
  terrariumId: string;

  @Prop({ required: true })
  name: string;

  // 공간 확장 업그레이드 단계 (수용량 = BASE_CAPACITY + spaceLevel * CAPACITY_PER_LEVEL)
  @Prop({ default: 0, min: 0 })
  spaceLevel: number;

  @Prop({ default: 85, min: 0, max: 100 })
  food: number;

  @Prop({ default: 78, min: 0, max: 100 })
  humidity: number;

  @Prop({ default: 24 })
  temperature: number;

  // key: speciesId, value: 이 사육장에 있는 마리 수
  @Prop({ type: Map, of: Number, default: {} })
  population: Map<string, number>;

  // key: speciesId, value: 번식 진행 시간(초)
  @Prop({ type: Map, of: Number, default: {} })
  breeding: Map<string, number>;
}
export const TerrariumSchema = SchemaFactory.createForClass(Terrarium);

// 보유한 장비 1종의 상태. 같은 장비를 또 얻으면 새로 만들지 않고 copies(중복 획득 수)만 늘린다.
@Schema({ _id: false })
export class EquipmentItem {
  @Prop({ required: true })
  itemId: string;

  // 레벨업에 쓰이는 중복 획득 개수(처음 얻은 1개는 포함하지 않는다)
  @Prop({ default: 0, min: 0 })
  copies: number;

  @Prop({ default: 1, min: 1 })
  level: number;

  // 각성에 성공할 때마다 3씩 늘어난다
  @Prop({ default: 5, min: 1 })
  maxLevel: number;

  @Prop({ default: 0, min: 0 })
  awakenCount: number;

  // 각성에 연속으로 실패한 횟수. 성공하면 0으로 돌아간다(다음 각성 확률 계산에 쓴다).
  @Prop({ default: 0, min: 0 })
  awakenFailures: number;
}
export const EquipmentItemSchema = SchemaFactory.createForClass(EquipmentItem);

@Schema({
  timestamps: true,
  collection: 'game_states',
  toJSON: { flattenMaps: true },
  toObject: { flattenMaps: true },
})
export class GameState {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ default: 400, min: 0 })
  coins: number;

  @Prop({ default: 0, min: 0 })
  pending: number;

  // 숲 탐색권 보유 개수. 탐색 시 777G 대신 1장을 쓸 수 있다.
  @Prop({ default: 0, min: 0 })
  explorationTickets: number;

  // 다이아. 업적·새 종 발견·레벨업으로 얻고, 닉네임 변경 같은 특별한 곳에 쓴다.
  @Prop({ default: 0, min: 0 })
  diamonds: number;

  @Prop({ default: 0, min: 0 })
  xp: number;

  // 야생 배틀 전투 경험치. key: speciesId, value: 그 종이 누적으로 쌓은 전투 경험치.
  // 레벨은 저장하지 않고 항상 이 값에서 계산한다(계정 레벨의 xp/getLevel과 같은 방식).
  @Prop({ type: Map, of: Number, default: {} })
  battleXp: Map<string, number>;

  // 종(콩벌레)에 붙인 내 전용 별명. key: speciesId, value: 별명. 나에게만 보이고
  // 다른 유저의 화면이나 랭킹·PvP 상대 표시에는 전혀 영향이 없다.
  @Prop({ type: Map, of: String, default: {} })
  speciesNicknames: Map<string, string>;

  // 투기장(PvP) 방어 식구로 지정한 종. 다른 유저가 투기장에서 상대로 만날 수 있다.
  // 지정 전엔 매칭 대상(상대)이 되지 않는다. 공격하는 건 이 값과 무관하게 언제든 가능하다.
  @Prop({ type: String, default: null })
  pvpDefenseSpeciesId: string | null;

  // 투기장 레이팅. 기본 1000이며, 승패로 공격자인 나만 바뀐다(상대는 영향 없음).
  @Prop({ default: 1000, min: 0 })
  pvpRating: number;

  // 보유 장비. 종류별로 한 줄이며 레벨·각성·중복 획득 수를 가진다.
  @Prop({ type: [EquipmentItemSchema], default: [] })
  equipment: EquipmentItem[];

  // 장착 슬롯. 칸마다 장비 itemId가 들어가고 빈 칸은 ''이다. 길이가 곧 슬롯 수(기본 3, 최대 5).
  @Prop({ type: [String], default: () => ['', '', ''] })
  equipmentSlots: string[];

  // 전설 이상이 마지막으로 나온 뒤 뽑은 횟수(천장 계산용)
  @Prop({ default: 0, min: 0 })
  equipmentPity: number;

  // 보유 사육장 목록 (최대 MAX_TERRARIUMS개). 첫 번째가 기본 사육장이다.
  @Prop({ type: [TerrariumSchema], default: [] })
  terrariums: Terrarium[];

  // 지금까지 발견(도감 등록)한 speciesId 목록
  @Prop({ type: [String], default: ['pandaKing'] })
  discovered: string[];

  // key: upgradeId, value: 현재 레벨 (공간 확장은 사육장별이라 Terrarium.spaceLevel에 저장)
  @Prop({ type: Map, of: Number, default: {} })
  upgrades: Map<string, number>;

  @Prop({
    type: DailyProgressSchema,
    default: () => ({ day: '', feed: 0, observe: 0, births: 0, claimed: [] }),
  })
  daily: DailyProgress;

  @Prop({ type: StatsSchema, default: () => ({}) })
  stats: Stats;

  // key: 'observe' 또는 `${terrariumId}:${'feed' | 'mist' | 'climate'}`, value: 쿨다운 해제 시각(ms epoch)
  @Prop({ type: Map, of: Number, default: {} })
  cooldowns: Map<string, number>;

  // 이미 보상을 받은 achievementId 목록. 일일 퀘스트와 달리 초기화되지 않는다.
  @Prop({ type: [String], default: [] })
  achievementsClaimed: string[];

  @Prop({ type: [LogEntrySchema], default: [] })
  logs: LogEntry[];

  @Prop({ default: false })
  paused: boolean;

  @Prop({ default: false })
  sound: boolean;
}

export const GameStateSchema = SchemaFactory.createForClass(GameState);
