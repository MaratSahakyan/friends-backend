import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CreateUserDto, LoginUserDto } from './auth.dto';
import { AuthService } from './auth.service';
import { RefreshTokenGuard } from '../common/guards/refresh-token.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(201)
  @Post('register')
  async register(@Body() body: CreateUserDto) {
    return this.authService.register(body);
  }

  @HttpCode(200)
  @Post('login')
  async login(@Body() body: LoginUserDto) {
    return this.authService.login(body);
  }

  @UseGuards(RefreshTokenGuard)
  @Get('refresh')
  refreshTokens(@Req() req) {
    const userId = req.user.userId;
    return this.authService.refreshTokens(userId);
  }
}
