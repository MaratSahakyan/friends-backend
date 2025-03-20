import { Module } from '@nestjs/common';
import { FriendsService } from './friends.service';

@Module({
  providers: [FriendsService],
  exports: [FriendsService],
})
export class FriendsModule {}
