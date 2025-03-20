import {
  IsNumber,
  IsNotEmpty,
  IsEnum,
  IsString,
  MaxLength,
  IsInt,
  Min,
  IsEmail,
} from 'class-validator';
import {
  IRespondFriendRequestDto,
  ISendFriendRequest,
  IUpdateUser,
  IUserBase,
} from './types';
import { FriendRequestStatus } from '../friend-request/types';
import { Transform } from 'class-transformer';

export class SendFriendRequestDto implements ISendFriendRequest {
  @IsNumber()
  @IsNotEmpty()
  receiverId: number;
}

export class RespondFriendRequestDto implements IRespondFriendRequestDto {
  @IsNotEmpty()
  @IsEnum(FriendRequestStatus, {
    message: 'Action must be either accept or reject',
  })
  action: FriendRequestStatus;
}

export class UserBase implements IUserBase {
  @IsString()
  @MaxLength(50)
  first_name: string;

  @IsString()
  @MaxLength(50)
  last_name: string;

  @IsInt()
  @Min(12)
  @Transform(({ value }) => parseInt(value, 10))
  age: number;

  @IsEmail()
  @MaxLength(255)
  email: string;
}

export class UpdateUserDto extends UserBase implements IUpdateUser {}
