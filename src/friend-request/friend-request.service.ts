import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FriendRequestStatus } from "./types";

@Injectable()
export class FriendRequestService {
  constructor(private readonly connection: DatabaseService) {}

  async sendFriendRequest(senderId: number, receiverId: number) {
    if (senderId === receiverId) {
      throw new BadRequestException({
        message: 'Sender and receiver cannot be the same.',
      });
    }

    try {
      const userCheckQuery = `SELECT id FROM users WHERE id = $1;`;
      const userCheckResult = await this.connection.query(userCheckQuery, [
        receiverId,
      ]);

      if (userCheckResult.rows.length === 0) {
        throw new BadRequestException({ message: 'Receiver does not exist.' });
      }

      const checkQuery = `
      SELECT sender_id, receiver_id, status 
      FROM friend_requests 
      WHERE (sender_id = $1 AND receiver_id = $2) 
         OR (sender_id = $2 AND receiver_id = $1);
    `;
      const checkResult = await this.connection.query(checkQuery, [
        senderId,
        receiverId,
      ]);

      if (checkResult.rows.length > 0) {
        const existingRequest = checkResult.rows[0];

        if (existingRequest.status === FriendRequestStatus.Pending) {
          if (existingRequest.sender_id === senderId) {
            return {
              message: 'Your friend request is pending.',
              status: FriendRequestStatus.Pending,
            };
          } else {
            return {
              message:
                'You have received a friend request. You can accept or reject it.',
              status: FriendRequestStatus.Pending,
            };
          }
        }

        if (existingRequest.status === FriendRequestStatus.Accept) {
          return {
            message: 'You are already friends.',
            status: FriendRequestStatus.Accept,
          };
        }

        if (existingRequest.status === FriendRequestStatus.Reject) {
          return {
            message: 'The friend request was rejected.',
            status: FriendRequestStatus.Reject,
          };
        }
      }

      const insertQuery = `
      INSERT INTO friend_requests (sender_id, receiver_id, status)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
      const insertResult = await this.connection.query(insertQuery, [
        senderId,
        receiverId,
        FriendRequestStatus.Pending,
      ]);

      return insertResult.rows[0];
    } catch (error) {
      console.error('Error in sendFriendRequest:', error);
      throw error;
    }
  }

  async getFriendRequests(userId: number) {
    const query = `
      SELECT u.id, 
             u.first_name,
             u.last_name,
             u.email,
             fr.status
      FROM friend_requests fr
      JOIN users u ON fr.sender_id = u.id
      WHERE fr.receiver_id = $1 AND fr.status = 'pending'
      ORDER BY fr.created_at DESC;
    `;

    const result = await this.connection.query(query, [userId]);

    return result.rows;
  }

  async respondToFriendRequest(
    receiverId: number,
    senderId: number,
    action: FriendRequestStatus,
  ) {
    console.log('=>(friends.service.ts:107) senderId', senderId);
    console.log('=>(friends.service.ts:107) receiverId', receiverId);
    try {
      const checkQuery = `
      SELECT * FROM friend_requests 
      WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending';
    `;
      const checkResult = await this.connection.query(checkQuery, [
        senderId,
        receiverId,
      ]);

      if (checkResult.rows.length === 0) {
        throw new BadRequestException({
          message: 'No pending friend request found.',
        });
      }

      if (action === FriendRequestStatus.Accept) {
        const insertFriendQuery = `
        INSERT INTO friends (user_id, friend_id)
        VALUES ($1, $2), ($2, $1);
      `;
        await this.connection.query(insertFriendQuery, [senderId, receiverId]);

        const updateQuery = `
        UPDATE friend_requests 
        SET status = 'accept' 
        WHERE sender_id = $1 AND receiver_id = $2;
      `;
        await this.connection.query(updateQuery, [senderId, receiverId]);

        return {
          message: 'Friend request accepted.',
          status: FriendRequestStatus.Accept,
        };
      }

      if (action === FriendRequestStatus.Reject) {
        const updateQuery = `
        UPDATE friend_requests 
        SET status = 'reject' 
        WHERE sender_id = $1 AND receiver_id = $2;
      `;
        await this.connection.query(updateQuery, [senderId, receiverId]);

        return {
          message: 'Friend request rejected.',
          status: FriendRequestStatus.Reject,
        };
      }
    } catch (error) {
      console.error('Error in respond friend request:', error);
      throw error;
    }
  }
}
