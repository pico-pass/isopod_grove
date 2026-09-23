import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

export interface GoogleProfile {
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ googleId }).exec();
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
}
