import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { Model, Types } from 'mongoose';
import type { Species } from '../species/schemas/species.schema';
import { SpeciesService } from '../species/species.service';
import { resolveFamily } from '../species/species.family';
import { GameStateService } from './game-state.service';
import { QuizRecord, QuizRecordDocument } from './schemas/quiz-record.schema';
import { getPuzzleDayKey, getPuzzleResetAt } from './puzzle-engine';
import {
  QUIZ_GRACE_MS,
  QUIZ_IMAGE_TTL_MS,
  QUIZ_MILESTONES,
  QUIZ_MIN_ANSWER_MS,
  QUIZ_MIN_MS,
  QUIZ_START_MS,
  QUIZ_STEP_MS,
  pickQuizAnswer,
  pickQuizChoices,
  quizLimitMs,
  quizMode,
  rollQuizZoom,
  type QuizSpeciesLike,
} from './quiz-engine';

interface RunLike {
  startedAt: number;
  streak: number;
  seen: string[];
  current: { index: number; speciesId: string; choices: string[]; mode: string; zoomScale: number; zoomX: number; zoomY: number; issuedAt: number; limitMs: number } | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// 이 콩 누구?: 규칙과 수치는 quiz-engine.ts, 여기서는 문제를 내고 답을 서버가 채점해 기록·보상을 정한다.
@Injectable()
export class QuizService {
  private readonly inFlight = new Set<string>();
  private readonly key = createHash('sha256').update(process.env.JWT_SECRET ?? 'isopod-quiz-secret').digest();
  private available: Set<string> | null = null;

  constructor(
    private readonly gameState: GameStateService,
    private readonly speciesService: SpeciesService,
    @InjectModel(QuizRecord.name) private readonly records: Model<QuizRecordDocument>,
  ) {}

  // 그림 파일이 있는 폴더(프론트의 public). 환경 변수로 바꿀 수 있고 기본은 저장소의 frontend/public이다.
  assetDir(): string {
    return process.env.QUIZ_ASSET_DIR ?? resolve(__dirname, '../../../frontend/public');
  }

  private async withLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(userId)) throw new BadRequestException('처리 중이에요. 잠시만 기다려 주세요.');
    this.inFlight.add(userId);
    try {
      return await fn();
    } finally {
      this.inFlight.delete(userId);
    }
  }

  // ---- 그림 주소(일회용) ----
  // 주소에 종 이름이 드러나지 않게 종 id와 만료 시각을 암호화한 토큰을 쓴다. 암호를 풀 수 있는 건 서버뿐이다.
  makeImageToken(speciesId: string, now = Date.now()): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const body = Buffer.concat([cipher.update(JSON.stringify({ s: speciesId, e: now + QUIZ_IMAGE_TTL_MS }), 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
  }

  readImageToken(token: string, now = Date.now()): string | null {
    try {
      const raw = Buffer.from(token, 'base64url');
      if (raw.length < 12 + 16 + 2) return null;
      const decipher = createDecipheriv('aes-256-gcm', this.key, raw.subarray(0, 12));
      decipher.setAuthTag(raw.subarray(12, 28));
      const json = JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8')) as { s?: string; e?: number };
      return typeof json.s === 'string' && typeof json.e === 'number' && json.e >= now ? json.s : null;
    } catch {
      return null;
    }
  }

  // 토큰이 가리키는 그림 파일 경로(없으면 404). 퀴즈에 나올 수 있는 종의 그림만 내준다.
  async imagePath(token: string): Promise<string> {
    const speciesId = this.readImageToken(token);
    if (!speciesId) throw new NotFoundException();
    const species = await this.speciesService.findOne(speciesId);
    if (!species?.image || !species.image.startsWith('/assets/')) throw new NotFoundException();
    const file = join(this.assetDir(), species.image);
    if (!file.startsWith(this.assetDir()) || !existsSync(file)) throw new NotFoundException();
    return file;
  }

  // 퀴즈에 쓸 수 있는 종(그림 파일이 실제로 있는 종)
  private async pool(): Promise<(QuizSpeciesLike & Species)[]> {
    const all = await this.speciesService.findAll();
    if (!this.available) {
      this.available = new Set(all.filter((s) => s.image && s.image.startsWith('/assets/') && existsSync(join(this.assetDir(), s.image))).map((s) => s.speciesId));
    }
    return all.filter((s) => this.available!.has(s.speciesId)).map((s) => Object.assign(s, { family: resolveFamily(s) })) as (QuizSpeciesLike & Species)[];
  }

  // 예전 계정(quiz 필드가 없는 문서)도 읽을 수 있게 기본값을 채워서 돌려준다
  private progressOf(gameState: { quiz?: { run?: RunLike | null; bestStreak?: number; milestone?: number } }) {
    const p = gameState.quiz;
    return { run: p?.run ?? null, bestStreak: p?.bestStreak ?? 0, milestone: p?.milestone ?? 0 };
  }

  private questionView(run: RunLike, names: Map<string, string>) {
    const q = run.current;
    if (!q) return null;
    return {
      index: q.index,
      mode: q.mode,
      zoom: { scale: q.zoomScale, x: q.zoomX, y: q.zoomY },
      choices: q.choices.map((id) => ({ speciesId: id, name: names.get(id) ?? id })),
      limitMs: q.limitMs,
      imageUrl: `/api/quiz-image/${this.makeImageToken(q.speciesId)}`,
    };
  }

  private async rankOf(dayKey: string, bestStreak: number) {
    const [better, participants] = await Promise.all([
      this.records.countDocuments({ dayKey, bestStreak: { $gt: bestStreak } }),
      this.records.countDocuments({ dayKey }),
    ]);
    return { rank: better + 1, participants };
  }

  // 다음 문제를 낸다(run.current를 채운다).
  private async issue(run: RunLike, now: number): Promise<void> {
    const pool = await this.pool();
    if (pool.length < 4) throw new BadRequestException('퀴즈를 낼 콩벌레 그림이 부족해요.');
    const answer = pickQuizAnswer(pool, run.seen)!;
    const choices = pickQuizChoices(pool, answer, run.streak);
    const zoom = rollQuizZoom();
    run.current = { index: run.streak + 1, speciesId: answer.speciesId, choices, mode: quizMode(run.streak), zoomScale: zoom.scale, zoomX: zoom.x, zoomY: zoom.y, issuedAt: now, limitMs: quizLimitMs(run.streak) };
    run.seen = [...run.seen, answer.speciesId].slice(-Math.max(1, pool.length - 4));
  }

  // 판을 끝낸다: 오늘 최고 연속 정답을 기록하고, 평생 최고가 새로 닿은 단계의 보너스를 준다. 게임 상태(run=null, 보너스 수령)는 호출한 쪽이 저장한다.
  private async settle(gameState: Awaited<ReturnType<GameStateService['getOrThrow']>>, userId: string, streak: number, now: number) {
    const progress = this.progressOf(gameState);
    const today = getPuzzleDayKey(now);
    const uid = new Types.ObjectId(userId);
    let improved = false;
    if (streak > 0) {
      const before = await this.records.findOne({ dayKey: today, userId: uid }).lean<{ bestStreak: number }>();
      const expireAt = new Date(getPuzzleResetAt(today) + 45 * DAY_MS);
      if (!before) {
        await this.records.create({ dayKey: today, userId: uid, bestStreak: streak, bestAt: new Date(now), runs: 1, expireAt });
        improved = true;
      } else {
        await this.records.updateOne({ dayKey: today, userId: uid }, { $inc: { runs: 1 } });
        if (streak > before.bestStreak) {
          await this.records.updateOne({ dayKey: today, userId: uid }, { $set: { bestStreak: streak, bestAt: new Date(now) } });
          improved = true;
        }
      }
    }
    const best = Math.max(progress.bestStreak, streak);
    const reachedCount = QUIZ_MILESTONES.filter((m) => m.streak <= best).length;
    const newMilestones = QUIZ_MILESTONES.slice(progress.milestone, reachedCount);
    const reward = newMilestones.reduce((sum, m) => ({ explorationTickets: sum.explorationTickets + m.reward.explorationTickets, diamonds: sum.diamonds + m.reward.diamonds }), { explorationTickets: 0, diamonds: 0 });
    gameState.explorationTickets += reward.explorationTickets;
    gameState.diamonds += reward.diamonds;
    gameState.quiz = { run: null, bestStreak: best, milestone: Math.max(progress.milestone, reachedCount) };
    const text = [reward.explorationTickets ? `🎟️ 탐색권 ${reward.explorationTickets}장` : '', reward.diamonds ? `💎 ${reward.diamonds}개` : ''].filter(Boolean).join(' · ');
    if (streak > 0 && (improved || text)) this.gameState.pushLog(gameState, 'trophy', `이 콩 누구? ${streak}연속 정답!${text ? ` — ${text}` : ''}`);
    return { reward, milestones: newMilestones, bestStreak: best, newAllTimeBest: streak > progress.bestStreak, improved };
  }

  // 시간이 지나 버린 문제가 남아 있으면 그대로 끝낸 것으로 정리한다(저장은 호출한 쪽이).
  private isExpired(run: RunLike | null, now: number): boolean {
    return !!run?.current && now > run.current.issuedAt + run.current.limitMs + QUIZ_GRACE_MS;
  }

  async get(userId: string) {
    const gameState = await this.gameState.getOrThrow(userId);
    const now = Date.now();
    const progress = this.progressOf(gameState);
    let run = progress.run;
    if (this.isExpired(run, now)) {
      await this.settle(gameState, userId, run!.streak, now);
      await gameState.save();
      run = null;
    }
    const dayKey = getPuzzleDayKey(now);
    const record = await this.records.findOne({ dayKey, userId: new Types.ObjectId(userId) }).lean<{ bestStreak: number }>();
    const today = record ? { bestStreak: record.bestStreak, ...(await this.rankOf(dayKey, record.bestStreak)) } : null;
    const names = new Map((await this.speciesService.findAll()).map((s) => [s.speciesId, s.name]));
    const fresh = this.progressOf(gameState);
    return {
      dayKey,
      today,
      bestStreak: fresh.bestStreak,
      milestoneReached: fresh.milestone,
      resetsAt: getPuzzleResetAt(dayKey),
      run: run && run.current ? { streak: run.streak, question: this.questionView(run, names), remainingMs: Math.max(0, run.current.issuedAt + run.current.limitMs - now) } : null,
      rules: { startMs: QUIZ_START_MS, stepMs: QUIZ_STEP_MS, minMs: QUIZ_MIN_MS, graceMs: QUIZ_GRACE_MS, milestones: QUIZ_MILESTONES },
    };
  }

  // 새 판을 시작한다(끝내지 않은 이전 판이 있으면 그 판의 기록을 먼저 정리한다).
  async start(userId: string) {
    return this.withLock(userId, async () => {
      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      const now = Date.now();
      const prev = this.progressOf(gameState).run;
      if (prev) await this.settle(gameState, userId, prev.streak, now);
      const run: RunLike = { startedAt: now, streak: 0, seen: [], current: null };
      await this.issue(run, now);
      const progress = this.progressOf(gameState);
      gameState.quiz = { run, bestStreak: progress.bestStreak, milestone: progress.milestone };
      await gameState.save();
      const names = new Map((await this.speciesService.findAll()).map((s) => [s.speciesId, s.name]));
      return { streak: 0, question: this.questionView(run, names) };
    });
  }

  // 답을 낸다. 맞으면 다음 문제를, 틀리거나 시간이 지났으면(빈 문자열 포함) 판을 끝내고 정답을 알려 준다.
  async answer(userId: string, speciesId: string) {
    return this.withLock(userId, async () => {
      const gameState = await this.gameState.getOrThrow(userId);
      this.gameState.guardPaused(gameState);
      const progress = this.progressOf(gameState);
      const run = progress.run;
      if (!run || !run.current) throw new BadRequestException('진행 중인 퀴즈가 없어요. 새로 시작해 주세요.');
      const now = Date.now();
      const q = run.current;
      const elapsed = now - q.issuedAt;
      const answeredSpecies = (await this.speciesService.findOne(q.speciesId)) as Species | null;
      const reveal = { speciesId: q.speciesId, name: answeredSpecies?.name ?? q.speciesId, image: answeredSpecies?.image, filter: answeredSpecies?.filter ?? 'none' };
      const timedOut = elapsed > q.limitMs + QUIZ_GRACE_MS;
      if (!timedOut && speciesId !== '' && elapsed < QUIZ_MIN_ANSWER_MS) throw new BadRequestException('너무 빨라요! 보기를 읽고 골라 주세요.');
      const correct = !timedOut && speciesId === q.speciesId;
      if (correct) {
        const streak = run.streak + 1;
        const next: RunLike = { startedAt: run.startedAt, streak, seen: run.seen.slice(), current: null };
        await this.issue(next, now);
        gameState.quiz = { run: next, bestStreak: progress.bestStreak, milestone: progress.milestone };
        await gameState.save();
        const names = new Map((await this.speciesService.findAll()).map((s) => [s.speciesId, s.name]));
        return { gameState, message: '', correct: true as const, over: false as const, streak, answer: reveal, next: this.questionView(next, names), ended: null };
      }
      const ended = await this.settle(gameState, userId, run.streak, now);
      await gameState.save();
      const todayKey = getPuzzleDayKey(now);
      const todayRecord = run.streak > 0 ? await this.records.findOne({ dayKey: todayKey, userId: new Types.ObjectId(userId) }).lean<{ bestStreak: number }>() : null;
      const { rank, participants } = todayRecord ? await this.rankOf(todayKey, todayRecord.bestStreak) : { rank: null, participants: null };
      const rewardText = [ended.reward.explorationTickets ? `🎟️ 탐색권 ${ended.reward.explorationTickets}장` : '', ended.reward.diamonds ? `💎 ${ended.reward.diamonds}개` : ''].filter(Boolean).join(' · ');
      return {
        gameState,
        message: `${timedOut || speciesId === '' ? '시간 초과!' : '틀렸어요!'} ${run.streak}연속 정답${ended.newAllTimeBest && run.streak > 0 ? ' 🆕 최고 기록!' : ''}${rewardText ? ` — ${rewardText}` : ''}`,
        correct: false as const,
        over: true as const,
        timedOut: timedOut || speciesId === '',
        streak: run.streak,
        answer: reveal,
        next: null,
        ended: { ...ended, streak: run.streak, rank, participants },
      };
    });
  }
}
