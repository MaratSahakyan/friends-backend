import { Module } from '@nestjs/common';
import { FriendRequestService } from './friend-request.service';

@Module({
  providers: [FriendRequestService],
  exports: [FriendRequestService],
})
export class FriendRequestModule {}
