import { FriendRequestStatus } from '../friend-request/types';

export interface IUserBase {
  first_name: string;
  last_name: string;
  email: string;
  age: number;
}

export interface ICreateUser extends IUserBase {
  password: string;
}

export interface IUpdateUser extends IUserBase {}

export interface ISendFriendRequest {
  receiverId: number;
}

export interface IRespondFriendRequestDto {
  action: FriendRequestStatus;
}

export interface IUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  age: number;
  created_at: Date;
  updated_at: Date;
}
