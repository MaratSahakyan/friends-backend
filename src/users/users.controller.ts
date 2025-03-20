import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RespondFriendRequestDto, SendFriendRequestDto } from './users.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getUsers(@Query('search') search: string) {
    return this.usersService.getUsers(search);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/user/:userId')
  async getUserById(@Param('userId') userId: number) {
    return this.usersService.getUserById(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('friends')
  async getFriends(@Req() req) {
    return this.usersService.getFriends(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('friends/:friendId')
  async getFriendById(@Req() req, @Param('friendId') friendId: number) {
    return this.usersService.getFriendById(req.user.userId, friendId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('friend-request')
  async sendFriendRequest(@Req() req, @Body() body: SendFriendRequestDto) {
    return this.usersService.sendFriendRequest(
      req.user.userId,
      body.receiverId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('friend-requests')
  async getFriendRequests(@Req() req) {
    return this.usersService.getFriendRequests(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('friend-request/:senderId/respond')
  async respondToFriendRequest(
    @Req() req,
    @Param('senderId') senderId: number,
    @Body() body: RespondFriendRequestDto,
  ) {
    return this.usersService.respondToFriendRequest(
      req.user.userId,
      senderId,
      body.action,
    );
  }
}
