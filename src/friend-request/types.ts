export enum FriendRequestStatus {
  Pending = 'pending',
  Accept = 'accept',
  Reject = 'reject',
}

export interface IFriendRequest {
  id: number;
  sender_id: number;
  receiver_id: number;
  status: FriendRequestStatus;
  created_at: Date;
  updated_at: Date;
}