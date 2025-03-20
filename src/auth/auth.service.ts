import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { compareSync } from 'bcrypt';
import { UsersService } from '../users/users.service';
import { ICreateUser } from '../users/types';
import { IJwtConfig } from '../config/types';
import { IUserLogin } from './types';

@Injectable()
export class AuthService {
  private get jwtConfig() {
    return this.configService.get<IJwtConfig>('jwt');
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (user && compareSync(pass, user.password_hash)) {
      return user;
    }
    return null;
  }

  async register(data: ICreateUser) {
    try {
      await this.usersService.create(data);

      return {
        message: 'You are registered successfully.',
      };
    } catch (error) {
      console.error(error);
      throw new BadRequestException({
        message: 'Wrong Credentials. Please try again',
      });
    }
  }

  async login(login: IUserLogin) {
    const user = await this.validateUser(login.email, login.password);
    if (!user) {
      throw new NotFoundException({
        message: 'Wrong Credentials.',
      });
    }

    const payload = { userId: user.id, email: user.email };

    const tokens = await this.getTokens(payload);

    return { tokens };
  }

  async refreshTokens(userId: number) {
    const user = await this.usersService.findByUserId(userId);

    const payload = {
      userId: user.id,
      email: user.email,
    };

    return this.getTokens(payload);
  }

  async getTokens(payload) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.jwtConfig.accessSecret,
        expiresIn: '7d',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.jwtConfig.refreshSecret,
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
