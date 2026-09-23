import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  issueToken(user: UserDocument): string {
    return this.jwtService.sign({ sub: user._id.toString() });
  }
}
