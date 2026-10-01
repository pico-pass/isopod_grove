import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

export interface GoogleProfile {
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

// nickname을 정했으면 그걸, 아니면 구글 프로필 이름을 화면에 보여준다.
export function effectiveDisplayName(user: {
  nickname?: string;
  displayName: string;
}): string {
  return user.nickname || user.displayName;
}

const MONGO_DUPLICATE_KEY_ERROR = 11000;

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ googleId }).exec();
  }

  findByIds(ids: (string | Types.ObjectId)[]): Promise<UserDocument[]> {
    return this.userModel.find({ _id: { $in: ids } }).exec();
  }

  // 닉네임(직접 정한 이름) 또는 구글 표시 이름으로 유저를 찾는다. 친구 추가 검색에 쓴다.
  searchByName(
    query: string,
    excludeUserId: string,
    limit = 10,
  ): Promise<UserDocument[]> {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    return this.userModel
      .find({
        _id: { $ne: excludeUserId },
        $or: [{ nickname: regex }, { displayName: regex }],
      })
      .limit(limit)
      .exec();
  }

  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.userModel
      .findById(userId, { isAdmin: 1 })
      .exec();
    return !!user?.isAdmin;
  }

  count(): Promise<number> {
    return this.userModel.countDocuments().exec();
  }

  async findOrCreateFromGoogle(profile: GoogleProfile): Promise<UserDocument> {
    const existing = await this.findByGoogleId(profile.googleId);
    if (existing) {
      existing.email = profile.email;
      existing.displayName = profile.displayName;
      existing.avatarUrl = profile.avatarUrl;
      return existing.save();
    }
    return this.userModel.create(profile);
  }

  async isNicknameTaken(nickname: string, excludeUserId: string): Promise<boolean> {
    const existing = await this.userModel
      .findOne({ nickname, _id: { $ne: excludeUserId } })
      .exec();
    return !!existing;
  }

  async setNickname(userId: string, nickname: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없어요.');
    }
    user.nickname = nickname;
    try {
      return await user.save();
    } catch (e) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        e.code === MONGO_DUPLICATE_KEY_ERROR
      ) {
        throw new BadRequestException('이미 사용 중인 닉네임이에요.');
      }
      throw e;
    }
  }
}
