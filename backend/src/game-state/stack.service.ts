import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { SpeciesService } from '../species/species.service';
import { GameStateService } from './game-state.service';
import { StackRecord, StackRecordDocument } from './schemas/stack-record.schema';
import { getPuzzleDayKey, getPuzzleResetAt } from './puzzle-engine';
import {
  STACK_GROW,
  STACK_GROW_STREAK,
  STACK_MAX_DELAY,
  STACK_MAX_HEIGHT,
  STACK_MILESTONES,
  STACK_MIN_DELAY,
  STACK_PERFECT_TOLERANCE_BY_RARITY,
  STACK_RANGE,
  STACK_RUN_EXPIRE_MS,
  STACK_SPEED_EVERY,
  STACK_SPEED_MAX,
  STACK_SPEED_START,
  STACK_START_W,
  STACK_TPS,
  isStackTimePlausible,
  isValidStackDelays,
  simulateStack,
} from './stack-engine';

// 콩 쌓기: 규칙과 수치는 stack-engine.ts, 여기서는 판을 시작·끝내고 기록·보상을 서버가 정한다.
@Injectable()
export class StackService {
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly gameState: GameStateService,
    private readonly speciesService: SpeciesService,
    @InjectModel(StackRecord.name) private readonly records: Model<StackRecordDocument>,
  ) {}

  private async withLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(userId)) throw new BadRequestException('처리 중이에요. 잠시만 기다려 주세요.');
    this.inFlight.add(userId);
    try {
      return await fn();
    } finally {
      this.inFlight.delete(userId);
    }
  }

  // 예전 계정(stack 필드가 없는 문서)도 읽을 수 있게 기본값을 채워서 돌려준다
  private progressOf(gameState: { stack?: { run?: { seed: number; startedAt: number; speciesId?: string; rarity?: number } | null; dayKey?: string; milestone?: number; bestHeight?: number } }) {
    const p = gameState.stack;
    return {
      run: p?.run ? { seed: p.run.seed, startedAt: p.run.startedAt, speciesId: p.run.speciesId ?? '', rarity: p.run.rarity ?? 0 } : null,
      dayKey: p?.dayKey ?? '',
      milestone: p?.milestone ?? 0,
      bestHeight: p?.bestHeight ?? 0,
    };
  }

  private async rankOf(dayKey: string, bestHeight: number) {
    const [better, participants] = await Promise.all([
      this.records.countDocuments({ dayKey, bestHeight: { $gt: bestHeight } }),
      this.records.countDocuments({ dayKey }),
    ]);
    return { rank: better + 1, participants };
  }

  async get(userId: string) {
    const gameState = await this.gameState.getOrThrow(userId);
    const dayKey = getPuzzleDayKey();
    const progress = this.progressOf(gameState);
    const record = await this.records.findOne({ dayKey, userId: new Types.ObjectId(userId) }).lean<{ bestHeight: number }>();
    const today = record ? { bestHeight: record.bestHeight, ...(await this.rankOf(dayKey, record.bestHeight)) } : null;
    return {
      dayKey,
      today,
      bestHeight: progress.bestHeight,
      milestoneReached: progress.dayKey === dayKey ? progress.milestone : 0,
      resetsAt: getPuzzleResetAt(dayKey),
      rules: {
        tps: STACK_TPS,
        range: STACK_RANGE,
        startWidth: STACK_START_W,
        maxHeight: STACK_MAX_HEIGHT,
        minDelay: STACK_MIN_DELAY,
        maxDelay: STACK_MAX_DELAY,
        speedStart: STACK_SPEED_START,
        speedMax: STACK_SPEED_MAX,
        speedEvery: STACK_SPEED_EVERY,
        grow: STACK_GROW,
        growStreak: STACK_GROW_STREAK,
        toleranceByRarity: STACK_PERFECT_TOLERANCE_BY_RARITY, // 인덱스 = 희귀도
        milestones: STACK_MILESTONES,
      },
    };
  }

  // 새 판을 시작한다. 내보낼 콩벌레(가진 종)를 고르면 서버가 시드를 정해서 주고 시작 시각과 희귀도를 적어 둔다. 끝내지 않은 이전 판은 버린다.
  async start(userId: string, speciesId: string) {
    return this.withLock(userId, async () => {
      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      const species = await this.speciesService.findOne(speciesId);
      if (!species) throw new BadRequestException('존재하지 않는 종이에요.');
      if (!(this.gameState.totalOf(gameState, speciesId) > 0)) throw new BadRequestException('아직 만나지 못한 식구예요.');
      const seed = randomBytes(4).readUInt32BE(0);
      const prev = this.progressOf(gameState);
      gameState.stack = { ...prev, run: { seed, startedAt: Date.now(), speciesId, rarity: species.rarity } };
      await gameState.save();
      return { seed, speciesId, rarity: species.rarity };
    });
  }

  // 판을 마친다. 통나무마다 떨어뜨린 틱 수로 서버가 처음부터 다시 돌려 높이를 정하고, 실제로 흐른 시간보다 긴 기록은 거절한다.
  async finish(userId: string, delays: number[]) {
    return this.withLock(userId, async () => {
      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      const progress = this.progressOf(gameState);
      const run = progress.run;
      if (!run) throw new BadRequestException('진행 중인 쌓기가 없어요. 새로 시작해 주세요.');
      const now = Date.now();
      const elapsed = now - run.startedAt;
      if (elapsed > STACK_RUN_EXPIRE_MS) {
        gameState.stack = { ...progress, run: null };
        await gameState.save();
        throw new BadRequestException('시작한 지 너무 오래된 판이라 무효예요. 새로 시작해 주세요.');
      }
      if (!isValidStackDelays(delays)) throw new BadRequestException('쌓은 기록이 올바르지 않아요.');
      const result = simulateStack(run.seed, run.rarity, delays);
      if (!isStackTimePlausible(result.ticks, elapsed)) throw new BadRequestException('기록이 실제로 쌓은 시간보다 길어요. 다시 쌓아 주세요.');

      // 기록: 오늘 최고 높이를 넘었을 때만 갱신한다.
      const today = getPuzzleDayKey();
      const uid = new Types.ObjectId(userId);
      const height = result.height;
      const before = await this.records.findOne({ dayKey: today, userId: uid }).lean<{ bestHeight: number }>();
      const expireAt = new Date(getPuzzleResetAt(today) + 45 * 24 * 60 * 60 * 1000);
      if (!before) {
        await this.records.create({ dayKey: today, userId: uid, bestHeight: height, bestAt: new Date(now), speciesId: run.speciesId, runs: 1, expireAt });
      } else {
        await this.records.updateOne({ dayKey: today, userId: uid }, { $inc: { runs: 1 } });
        if (height > before.bestHeight) {
          await this.records.updateOne({ dayKey: today, userId: uid }, { $set: { bestHeight: height, bestAt: new Date(now), speciesId: run.speciesId } });
        }
      }
      const bestToday = Math.max(height, before?.bestHeight ?? 0);
      const improved = !before || height > before.bestHeight;

      // 보상: 오늘 최고 높이가 새로 닿은 단계마다 하루 한 번씩. 받은 기록은 게임 상태와 한 번에 저장된다.
      const reachedCount = STACK_MILESTONES.filter((m) => m.height <= bestToday).length;
      const alreadyCount = progress.dayKey === today ? progress.milestone : 0;
      const newMilestones = STACK_MILESTONES.slice(alreadyCount, reachedCount);
      const reward = newMilestones.reduce(
        (sum, m) => ({
          explorationTickets: sum.explorationTickets + m.reward.explorationTickets,
          equipmentShards: sum.equipmentShards + m.reward.equipmentShards,
          diamonds: sum.diamonds + m.reward.diamonds,
        }),
        { explorationTickets: 0, equipmentShards: 0, diamonds: 0 },
      );
      gameState.explorationTickets += reward.explorationTickets;
      gameState.equipmentShards = (gameState.equipmentShards || 0) + reward.equipmentShards;
      gameState.diamonds += reward.diamonds;
      const newAllTimeBest = height > progress.bestHeight;
      gameState.stack = { run: null, dayKey: today, milestone: Math.max(alreadyCount, reachedCount), bestHeight: Math.max(progress.bestHeight, height) };

      const rewardText = [
        reward.explorationTickets ? `🎟️ 탐색권 ${reward.explorationTickets}장` : '',
        reward.equipmentShards ? `🔩 장비 조각 ${reward.equipmentShards}개` : '',
        reward.diamonds ? `💎 ${reward.diamonds}개` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      const message = `콩 쌓기 ${height}칸!${result.completed ? ' 🏆 끝까지 완주!' : ''}${newAllTimeBest ? ' 🆕 최고 기록!' : ''}${rewardText ? ` — ${rewardText}` : ''}`;
      if (improved || rewardText) this.gameState.pushLog(gameState, 'trophy', message);
      await gameState.save();

      const { rank, participants } = await this.rankOf(today, bestToday);
      return {
        gameState,
        message,
        height,
        perfects: result.perfects,
        ticks: result.ticks,
        completed: result.completed,
        speciesId: run.speciesId,
        rarity: run.rarity,
        improved,
        bestToday,
        bestHeight: Math.max(progress.bestHeight, height),
        newAllTimeBest,
        rank,
        participants,
        reward,
        milestones: newMilestones,
      };
    });
  }
}
