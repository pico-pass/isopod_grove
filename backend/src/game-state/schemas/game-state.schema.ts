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

  // 오늘 서바이벌에 입장한 횟수(입장할 때 센다). 날짜가 바뀌면 daily 전체가 새로 만들어지며 0으로 돌아간다.
  @Prop({ default: 0 })
  survivalAttempts: number;

  // 오늘 다이아로 산 추가 도전/입장 횟수. 하루 한도는 기본 횟수에 이 값을 더한 것이다.
  @Prop({ default: 0 })
  bossExtraAttempts: number;

  @Prop({ default: 0 })
  survivalExtraAttempts: number;

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

  // 보스 타워 "쉬움"에서 깬 가장 높은 층. 한 번 오르면 내려가지 않는다. 다음 도전 가능 층(= 이 값 + 1)과 업적·랭킹에 쓴다.
  @Prop({ default: 0 })
  highestBossFloor: number;

  // 보스 타워 난이도별로 깬 최고 층. 쉬움은 위의 highestBossFloor를 그대로 쓴다(난이도가 생기기 전 기록이 쉬움 기록이 된다).
  @Prop({ default: 0 })
  bossFloorNormal: number;

  @Prop({ default: 0 })
  bossFloorHard: number;

  @Prop({ default: 0 })
  bossFloorExtreme: number;

  // 보스 타워 승리 누적 횟수(이미 깬 층을 다시 이긴 것도 센다)
  @Prop({ default: 0 })
  bossWins: number;

  // 서바이벌(무한 전투)에서 도달한 가장 높은 스테이지. 한 번 오르면 내려가지 않는다(업적·랭킹·보상 기준).
  @Prop({ default: 0 })
  highestSurvivalStage: number;

  // 서바이벌 입장 횟수 누적
  @Prop({ default: 0 })
  survivalRuns: number;

  // 투기장 현재 연승. 지면 0으로 돌아간다(재도전 제한으로 거절된 시도는 영향이 없다).
  @Prop({ default: 0 })
  pvpWinStreak: number;

  // 투기장 최고 연승 기록. 한 번 오르면 내려가지 않아 업적 조건으로 쓴다.
  @Prop({ default: 0 })
  bestPvpWinStreak: number;
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

  // 꾸미기: 배경 장식 id(빈 문자열이면 기본 사진 그대로)와 소품 칸(DECOR_PROP_SLOTS칸, 빈 칸은 ''). 옛 사육장은 필드가 없을 수 있다.
  @Prop({ type: String, default: '' })
  decorBackdrop: string;

  @Prop({ type: [String], default: [] })
  decorProps: string[];
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

// 진행 중인 서바이벌 엘리트 직접 전투. 이 스테이지의 적 능력치와 지금까지의 전투 상태·기록을 들고 있다.
@Schema({ _id: false })
export class SurvivalDuel {
  @Prop({ required: true })
  stage: number;

  // 화면에 보일 적 종(스테이지 등급에서 한 번 골라 저장해 새로고침해도 같은 종이 보이게 한다)
  @Prop({ default: '' })
  enemySpeciesId: string;

  // 이 전투의 적 계열(SpeciesFamily). 비어 있으면 상성이 생기기 전에 시작한 전투라 보정이 없다.
  @Prop({ default: '' })
  enemyFamily: string;

  // 이 전투의 환경(BattleEnvironmentId). 비어 있으면 환경이 생기기 전에 시작한 전투라 상성만 적용된다.
  @Prop({ default: '' })
  environment: string;

  // 이 전투를 시작할 때의 내 HP(이어받은 HP)
  @Prop({ required: true })
  mineHp: number;

  @Prop({ required: true })
  enemyHpMax: number;

  @Prop({ required: true })
  enemyAtk: number;

  @Prop({ required: true })
  enemyDef: number;

  @Prop({ default: 1 })
  turn: number;

  @Prop({ required: true })
  myHp: number;

  @Prop({ required: true })
  enemyHp: number;

  @Prop({ default: false })
  enraged: boolean;

  @Prop({ default: false })
  charged: boolean;

  @Prop({ default: 0 })
  strikeCooldown: number;

  // 회복은 한 구간(엘리트와 엘리트 사이)에 한 번만 쓸 수 있다
  @Prop({ default: false })
  healUsed: boolean;

  @Prop({ type: [Object], default: [] })
  log: Record<string, unknown>[];
}
export const SurvivalDuelSchema = SchemaFactory.createForClass(SurvivalDuel);

// 서바이벌에서 고른 버프 횟수(같은 버프를 여러 번 고를 수 있다)
@Schema({ _id: false })
export class SurvivalBuffs {
  @Prop({ default: 0 })
  atk: number;

  @Prop({ default: 0 })
  def: number;

  @Prop({ default: 0 })
  hp: number;

  @Prop({ default: 0 })
  regen: number;
}
export const SurvivalBuffsSchema = SchemaFactory.createForClass(SurvivalBuffs);

// 진행 중인 서바이벌 런(유저당 하나). 입장할 때 굴린 능력치(base*)는 런이 끝날 때까지 고정이고,
// 레벨·장비를 나중에 바꿔도 이 런에는 반영되지 않는다. 런이 끝나거나 포기하면 null로 돌아간다.
@Schema({ _id: false })
export class SurvivalRun {
  @Prop({ required: true })
  speciesId: string;

  // 입장할 때의 전투 레벨(화면 표시용)
  @Prop({ default: 1 })
  level: number;

  @Prop({ required: true })
  baseHp: number;

  @Prop({ required: true })
  baseAtk: number;

  @Prop({ required: true })
  baseDef: number;

  // 현재 HP
  @Prop({ required: true })
  hp: number;

  // 마지막으로 깬 스테이지
  @Prop({ default: 0 })
  stage: number;

  @Prop({ type: SurvivalBuffsSchema, default: () => ({}) })
  buffs: SurvivalBuffs;

  // 고르기를 기다리는 버프 id들. 비어 있으면 선택 대기 중이 아니다(실제로는 항상 선택 대기 상태로만 저장된다).
  @Prop({ type: [String], default: [] })
  choices: string[];

  // 이번 런에서 지금까지 받은 보상(화면 표시용)
  @Prop({ default: 0 })
  goldEarned: number;

  @Prop({ default: 0 })
  xpEarned: number;

  @Prop({ default: 0 })
  diamondsEarned: number;

  // 'auto'면 구간 전체를 자동으로 진행하고, 'direct'면 일반 스테이지는 자동으로, 엘리트는 직접 전투로 진행한다.
  @Prop({ default: 'auto' })
  mode: string;

  // 직접 전투 모드에서 이번 구간의 회복을 이미 썼는지(버프를 고르면 새 구간이라 다시 쓸 수 있다)
  @Prop({ default: false })
  healUsed: boolean;

  // 직접 전투 모드에서 지금 진행 중인 엘리트 전투. 없으면 null.
  @Prop({ type: SurvivalDuelSchema, default: null })
  duel: SurvivalDuel | null;

  // 쓰러진 상태로 부활을 기다리는 중인지, 이번 런에서 몇 번 부활했는지
  @Prop({ default: false })
  dead: boolean;

  @Prop({ default: 0 })
  revives: number;

  @Prop({ required: true })
  startedAt: number;
}
export const SurvivalRunSchema = SchemaFactory.createForClass(SurvivalRun);

// 진행 중인 야생 배틀 직접 전투. 시작할 때 뽑은 상대와 굴린 양쪽 능력치, 지금까지의 전투 상태·기록을 서버가 들고 있다.
@Schema({ _id: false })
export class WildDuel {
  @Prop({ required: true })
  speciesId: string;

  // 고른 난이도 = 상대 희귀도(0~4)
  @Prop({ required: true })
  difficulty: number;

  @Prop({ required: true })
  enemySpeciesId: string;

  // 이 전투의 환경(BattleEnvironmentId). 비어 있으면 환경 규칙이 생기기 전에 시작한 전투라 보정이 없다.
  @Prop({ default: '' })
  environment: string;

  @Prop({ default: 1 })
  enemyLevel: number;

  // 시작할 때의 내 전투 레벨(화면 표시용)
  @Prop({ default: 1 })
  level: number;

  @Prop({ required: true })
  mineHp: number;

  @Prop({ required: true })
  mineAtk: number;

  @Prop({ required: true })
  mineDef: number;

  @Prop({ required: true })
  enemyHpMax: number;

  @Prop({ required: true })
  enemyAtk: number;

  @Prop({ required: true })
  enemyDef: number;

  @Prop({ default: 1 })
  turn: number;

  @Prop({ required: true })
  myHp: number;

  @Prop({ required: true })
  enemyHp: number;

  @Prop({ default: false })
  charged: boolean;

  @Prop({ default: 0 })
  strikeCooldown: number;

  @Prop({ default: false })
  healUsed: boolean;

  @Prop({ type: [Object], default: [] })
  log: Record<string, unknown>[];

  @Prop({ required: true })
  startedAt: number;
}
export const WildDuelSchema = SchemaFactory.createForClass(WildDuel);

// 진행 중인 보스 직접 전투. 시작할 때 굴린 양쪽 능력치와 지금까지의 전투 상태·기록을 서버가 들고 있다.
@Schema({ _id: false })
export class BossDuel {
  @Prop({ required: true })
  speciesId: string;

  @Prop({ required: true })
  floor: number;

  @Prop({ required: true })
  difficulty: string;

  // 이 전투의 환경(BattleEnvironmentId). 비어 있으면 환경 규칙이 생기기 전에 시작한 전투라 보정이 없다.
  @Prop({ default: '' })
  environment: string;

  // 시작할 때의 전투 레벨(화면 표시용)
  @Prop({ default: 1 })
  level: number;

  // 시작할 때 굴린 내 능력치(전투 중에는 고정)
  @Prop({ required: true })
  mineHp: number;

  @Prop({ required: true })
  mineAtk: number;

  @Prop({ required: true })
  mineDef: number;

  // 시작할 때 굴린 보스 능력치(난이도 배율 반영)
  @Prop({ required: true })
  bossHpMax: number;

  @Prop({ required: true })
  bossAtk: number;

  @Prop({ required: true })
  bossDef: number;

  // 지금 전투 상태
  @Prop({ default: 1 })
  turn: number;

  @Prop({ required: true })
  myHp: number;

  @Prop({ required: true })
  bossHp: number;

  @Prop({ default: false })
  enraged: boolean;

  @Prop({ default: false })
  charged: boolean;

  @Prop({ default: 0 })
  strikeCooldown: number;

  @Prop({ default: false })
  healUsed: boolean;

  // 지금까지의 전투 기록(BattleTurn 목록). 매번 통째로 다시 대입해서 저장한다.
  @Prop({ type: [Object], default: [] })
  log: Record<string, unknown>[];

  @Prop({ required: true })
  startedAt: number;
}
export const BossDuelSchema = SchemaFactory.createForClass(BossDuel);

// 오늘의 퍼즐 진행. 별 보상과 순위 보상을 받은 기록을 게임 상태와 한 번에 저장해서, 보상이 중복되거나 빠지지 않게 한다.
// 기록(최소 이동 수)과 순위는 puzzle_records 컬렉션에 따로 있다.
@Schema({ _id: false })
export class PuzzleProgress {
  // stageStars·milestone이 가리키는 퍼즐 날짜(YYYY-MM-DD)
  @Prop({ default: '' })
  dayKey: string;

  // 그날 단계마다 이미 받은 별 보상 단계(인덱스 = 단계 - 1, 0~3). 더 높은 별을 따면 차액만 받는다.
  @Prop({ type: [Number], default: [] })
  stageStars: number[];

  // 그날 이미 받은 단계 달성 보너스 중 가장 높은 단계 수(0이면 아직 없음)
  @Prop({ default: 0 })
  milestone: number;

  // 순위 보상을 받은 퍼즐 날짜(YYYY-MM-DD)
  @Prop({ default: '' })
  rankClaimedDay: string;
}
export const PuzzleProgressSchema = SchemaFactory.createForClass(PuzzleProgress);

// 콩 달리기: 지금 달리는 중인 판. 시작할 때 서버가 시드와 시작 시각을 적어 두고, 끝날 때 이 시드로 점프 기록을 다시 돌려 점수를 정한다.
@Schema({ _id: false })
export class RunnerRun {
  @Prop({ required: true })
  seed: number;

  @Prop({ required: true })
  startedAt: number;

  // 이 판에 내보낸 콩벌레(종)와 그 희귀도(능력이 희귀도로 정해진다). 시작할 때 서버가 정해 두고 끝날 때 그대로 쓴다.
  @Prop({ default: '' })
  speciesId: string;

  @Prop({ default: 0 })
  rarity: number;
}
export const RunnerRunSchema = SchemaFactory.createForClass(RunnerRun);

// 콩 달리기 진행. 오늘의 보너스 수령 기록을 게임 상태와 한 번에 저장해서 중복 지급이 없게 한다. 오늘의 최고 기록·순위는 runner_records에 있다.
@Schema({ _id: false })
export class RunnerProgress {
  // 지금 달리는 판(없으면 null)
  @Prop({ type: RunnerRunSchema, default: null })
  run: RunnerRun | null;

  // milestone이 가리키는 날짜(YYYY-MM-DD, 한국 시간)
  @Prop({ default: '' })
  dayKey: string;

  // 그날 이미 받은 거리 보너스 개수(RUNNER_MILESTONES의 앞에서부터 센다)
  @Prop({ default: 0 })
  milestone: number;

  // 지금까지의 최고 기록(미터)
  @Prop({ default: 0 })
  bestMeters: number;
}
export const RunnerProgressSchema = SchemaFactory.createForClass(RunnerProgress);

// 골드로 산 부스트 한 종류의 유효 시간대(ms). 같은 종류를 다시 사면 until이 늘어난다.
@Schema({ _id: false })
export class ActiveBoost {
  @Prop({ required: true })
  kind: string;

  @Prop({ required: true })
  from: number;

  @Prop({ required: true })
  until: number;
}
export const ActiveBoostSchema = SchemaFactory.createForClass(ActiveBoost);

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

  // 숲 탐색권 보유 개수. 탐색 시 골드 대신 1장을 쓸 수 있다(골드로 살 수는 없다).
  @Prop({ default: 0, min: 0 })
  explorationTickets: number;

  // 지금까지 숲 탐색을 한 횟수(골드·탐색권 모두). 탐색 비용이 이 횟수만큼 올라간다(초기화 없음).
  // 업적용 stats.explored와 따로 센다 — 비용 공식이 생긴 시점부터 모두 0에서 시작하기 위해서다.
  @Prop({ default: 0, min: 0 })
  exploreCostSteps: number;

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

  // 진행 중인 야생 배틀 직접 전투. 없으면 null.
  @Prop({ type: WildDuelSchema, default: null })
  battleDuel: WildDuel | null;

  // 진행 중인 보스 직접 전투. 없으면 null.
  @Prop({ type: BossDuelSchema, default: null })
  bossDuel: BossDuel | null;

  // 진행 중인 서바이벌 런. 없으면 null.
  @Prop({ type: SurvivalRunSchema, default: null })
  survivalRun: SurvivalRun | null;

  // 서버가 마지막으로 시간 진행(advance)을 받은 시각(ms). 전설·신화 번식의 긴 오프라인 시간을 서버 시계로 재는 기준이다.
  // 이 필드가 생기기 전의 계정은 비어 있고(null) 마지막 저장 시각(updatedAt)을 대신 쓴다.
  @Prop({ type: Number, default: null })
  lastTickAt: number | null;

  // 잠근 종(speciesId). 잠근 종은 어느 사육장에서도 분양할 수 없다. 실수로 팔지 않게 하는 보호 장치다.
  @Prop({ type: [String], default: [] })
  lockedSpecies: string[];

  // 장비 조각. 중복 장비를 분해해서 얻고, 레벨업에 모자란 복사본을 메꾸는 데 쓴다.
  @Prop({ default: 0, min: 0 })
  equipmentShards: number;

  // 신화를 못 만난 채 다녀온 원정 횟수(천장 계산용). 신화가 나오면 0으로 돌아간다.
  @Prop({ default: 0, min: 0 })
  expeditionPity: number;

  // 골드로 산 부스트(종류별 하나). 만료된 항목은 다음에 살 때 정리된다.
  @Prop({ type: [ActiveBoostSchema], default: [] })
  boosts: ActiveBoost[];

  @Prop({ type: PuzzleProgressSchema, default: () => ({}) })
  puzzle: PuzzleProgress;

  @Prop({ type: RunnerProgressSchema, default: () => ({}) })
  runner: RunnerProgress;

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

  // 산 장식 id 목록(계정 공용, 어느 사육장에든 놓을 수 있다)
  @Prop({ type: [String], default: [] })
  decorOwned: string[];

  // 다른 유저가 내 사육장을 방문해 볼 수 있는지(기본 공개). 꺼도 내 화면에는 영향이 없다.
  @Prop({ default: true })
  terrariumPublic: boolean;

  @Prop({ default: false })
  paused: boolean;

  @Prop({ default: false })
  sound: boolean;
}

export const GameStateSchema = SchemaFactory.createForClass(GameState);
