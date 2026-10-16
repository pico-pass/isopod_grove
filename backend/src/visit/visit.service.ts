import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GameState, GameStateDocument } from '../game-state/schemas/game-state.schema';
import { getLevel } from '../game-state/game-engine';
import { findDecor, normalizeDecorProps } from '../decor/decor.data';
import { resolveFamily, type SpeciesFamily } from '../species/species.family';
import { SpeciesService } from '../species/species.service';
import { UsersService, effectiveDisplayName } from '../users/users.service';
import { TerrariumLike, TerrariumLikeDocument } from './schemas/terrarium-like.schema';

export const RECENT_LIKERS_LIMIT = 10;

export interface VisitResident {
  speciesId: string;
  name: string;
  image?: string;
  filter: string;
  rarity: number;
  family: SpeciesFamily;
  count: number;
}

export interface VisitTerrarium {
  terrariumId: string;
  name: string;
  backdrop: string;
  props: string[];
  total: number;
  residents: VisitResident[];
  likes: number;
  likedByMe: boolean;
}

// lean()으로 읽으면 Map 필드가 일반 객체로 내려온다. 옛 문서는 꾸미기 필드가 없을 수 있다.
interface LeanVisitTerrarium {
  terrariumId: string;
  name: string;
  population?: Record<string, number>;
  decorBackdrop?: string;
  decorProps?: string[];
}
interface LeanVisitState {
  userId: Types.ObjectId;
  xp: number;
  terrariumPublic?: boolean;
  terrariums?: LeanVisitTerrarium[];
}

const populationTotal = (population?: Record<string, number>) =>
  Object.values(population ?? {}).reduce((sum, n) => sum + (n > 0 ? n : 0), 0);

const hasDecor = (t: LeanVisitTerrarium) => !!t.decorBackdrop || (t.decorProps ?? []).some((id) => !!id);

@Injectable()
export class VisitService {
  constructor(
    @InjectModel(GameState.name)
    private gameStateModel: Model<GameStateDocument>,
    @InjectModel(TerrariumLike.name)
    private likeModel: Model<TerrariumLikeDocument>,
    private readonly usersService: UsersService,
    private readonly speciesService: SpeciesService,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('존재하지 않는 유저예요.');
    return new Types.ObjectId(id);
  }

  private async loadVisitState(ownerOid: Types.ObjectId): Promise<LeanVisitState> {
    const state = await this.gameStateModel
      .findOne(
        { userId: ownerOid },
        {
          userId: 1,
          xp: 1,
          terrariumPublic: 1,
          'terrariums.terrariumId': 1,
          'terrariums.name': 1,
          'terrariums.population': 1,
          'terrariums.decorBackdrop': 1,
          'terrariums.decorProps': 1,
        },
      )
      .lean<LeanVisitState>();
    if (!state) throw new NotFoundException('존재하지 않는 유저예요.');
    return state;
  }

  // 다른 유저(또는 나)의 사육장을 구경한다. 골드·다이아 같은 자원은 내려주지 않고 종·마릿수·장식·좋아요만 보여준다.
  // 종 별명은 나만 보는 이름이라 원래 종 이름을 쓴다.
  async getVisit(requesterId: string, ownerId: string) {
    const ownerOid = this.toObjectId(ownerId);
    const [state, user] = await Promise.all([this.loadVisitState(ownerOid), this.usersService.findById(ownerId)]);
    if (!user) throw new NotFoundException('존재하지 않는 유저예요.');
    const isMe = requesterId === ownerId;
    const isPublic = state.terrariumPublic !== false;
    if (!isPublic && !isMe) {
      throw new ForbiddenException('이 유저는 사육장을 비공개로 해 두었어요.');
    }

    const speciesById = new Map((await this.speciesService.findAll()).map((s) => [s.speciesId, s]));
    const requesterOid = Types.ObjectId.isValid(requesterId) ? new Types.ObjectId(requesterId) : null;
    const [likeCounts, myLikes] = await Promise.all([
      this.likeModel.aggregate<{ _id: string; n: number }>([
        { $match: { ownerId: ownerOid } },
        { $group: { _id: '$terrariumId', n: { $sum: 1 } } },
      ]),
      requesterOid && !isMe
        ? this.likeModel.find({ ownerId: ownerOid, likerId: requesterOid }, { terrariumId: 1 }).lean<{ terrariumId: string }[]>()
        : Promise.resolve([] as { terrariumId: string }[]),
    ]);
    const likesById = new Map(likeCounts.map((r) => [r._id, r.n]));
    const likedIds = new Set(myLikes.map((l) => l.terrariumId));

    const terrariums: VisitTerrarium[] = (state.terrariums ?? []).map((t) => {
      const residents: VisitResident[] = [];
      for (const [speciesId, count] of Object.entries(t.population ?? {})) {
        const sp = speciesById.get(speciesId);
        if (!sp || !(count > 0)) continue;
        residents.push({
          speciesId,
          name: sp.name,
          image: sp.image,
          filter: sp.filter,
          rarity: sp.rarity,
          family: resolveFamily(sp),
          count,
        });
      }
      residents.sort((a, b) => b.rarity - a.rarity || b.count - a.count || a.speciesId.localeCompare(b.speciesId));
      return {
        terrariumId: t.terrariumId,
        name: t.name,
        backdrop: findDecor(t.decorBackdrop ?? '')?.kind === 'backdrop' ? (t.decorBackdrop as string) : '',
        props: normalizeDecorProps(t.decorProps),
        total: populationTotal(t.population),
        residents,
        likes: likesById.get(t.terrariumId) ?? 0,
        likedByMe: likedIds.has(t.terrariumId),
      };
    });

    return {
      owner: {
        userId: ownerId,
        displayName: effectiveDisplayName(user),
        avatarUrl: user.avatarUrl,
        profileMessage: user.profileMessage,
        level: getLevel(state.xp),
      },
      isMe,
      isPublic,
      terrariums,
      totalLikes: terrariums.reduce((sum, t) => sum + t.likes, 0),
      // 내 사육장을 볼 때만: 누가 좋아해 줬는지(최근 순)
      recentLikers: isMe ? await this.getRecentLikers(ownerOid, terrariums) : [],
    };
  }

  private async getRecentLikers(ownerOid: Types.ObjectId, terrariums: VisitTerrarium[]) {
    const likes = await this.likeModel
      .find({ ownerId: ownerOid }, { likerId: 1, terrariumId: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(RECENT_LIKERS_LIMIT)
      .lean<{ likerId: Types.ObjectId; terrariumId: string; createdAt: number }[]>();
    if (likes.length === 0) return [];
    const users = await this.usersService.findByIds([...new Set(likes.map((l) => l.likerId.toString()))]);
    const userById = new Map(users.map((u) => [u._id.toString(), u]));
    const nameById = new Map(terrariums.map((t) => [t.terrariumId, t.name]));
    return likes.map((l) => {
      const user = userById.get(l.likerId.toString());
      return {
        userId: l.likerId.toString(),
        displayName: user ? effectiveDisplayName(user) : '알 수 없음',
        avatarUrl: user?.avatarUrl,
        terrariumName: nameById.get(l.terrariumId) ?? '',
        at: l.createdAt,
      };
    });
  }

  // 사육장에 좋아요를 누르거나(liked=true) 취소한다(false). 같은 요청을 여러 번 보내도 결과가 같다.
  // 내 사육장에는 누를 수 없고, 비공개 사육장에는 새로 누를 수 없다(취소는 언제든 된다).
  async setLike(requesterId: string, ownerId: string, terrariumId: string, liked: boolean) {
    const ownerOid = this.toObjectId(ownerId);
    if (requesterId === ownerId) {
      throw new BadRequestException('내 사육장에는 좋아요를 누를 수 없어요.');
    }
    if (!Types.ObjectId.isValid(requesterId)) throw new NotFoundException('존재하지 않는 유저예요.');
    const requesterOid = new Types.ObjectId(requesterId);

    if (liked) {
      const state = await this.loadVisitState(ownerOid);
      if (state.terrariumPublic === false) {
        throw new ForbiddenException('이 유저는 사육장을 비공개로 해 두었어요.');
      }
      if (!(state.terrariums ?? []).some((t) => t.terrariumId === terrariumId)) {
        throw new NotFoundException('존재하지 않는 사육장이에요.');
      }
      try {
        await this.likeModel.updateOne(
          { ownerId: ownerOid, terrariumId, likerId: requesterOid },
          { $setOnInsert: { createdAt: Date.now() } },
          { upsert: true },
        );
      } catch (e) {
        // 같은 사람이 동시에 두 번 보내면 유니크 인덱스에 걸릴 수 있다. 이미 눌린 것이므로 성공으로 본다.
        if ((e as { code?: number }).code !== 11000) throw e;
      }
    } else {
      await this.likeModel.deleteOne({ ownerId: ownerOid, terrariumId, likerId: requesterOid });
    }
    const likes = await this.likeModel.countDocuments({ ownerId: ownerOid, terrariumId });
    return { liked, likes };
  }

  // 아무 사육장이나 구경하러 간다: 나를 뺀 공개 사육장 주인 중에서 한 명. 식구가 있는 유저만 고르고,
  // 꾸며 둔 사육장이 있으면 대부분(80%) 그중에서 고른다.
  async getRandomTarget(requesterId: string) {
    const filter: Record<string, unknown> = { terrariumPublic: { $ne: false } };
    if (Types.ObjectId.isValid(requesterId)) filter.userId = { $ne: new Types.ObjectId(requesterId) };
    const states = await this.gameStateModel
      .find(filter, { userId: 1, 'terrariums.population': 1, 'terrariums.decorBackdrop': 1, 'terrariums.decorProps': 1 })
      .lean<LeanVisitState[]>();
    const populated = states.filter((s) => (s.terrariums ?? []).some((t) => populationTotal(t.population) > 0));
    const decorated = populated.filter((s) => (s.terrariums ?? []).some(hasDecor));
    const pool = decorated.length > 0 && Math.random() < 0.8 ? decorated : populated;
    if (pool.length === 0) throw new NotFoundException('아직 구경할 수 있는 사육장이 없어요.');
    return { userId: pool[Math.floor(Math.random() * pool.length)].userId.toString() };
  }
}
