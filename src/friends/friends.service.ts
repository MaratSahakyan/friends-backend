import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class FriendsService {
  constructor(private readonly connection: DatabaseService) {}

  async getFriends(userId: number) {
    const query = `
      SELECT f.friend_id AS id, u.first_name, u.last_name, u.email
      FROM friends f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = $1
      UNION
      SELECT f.user_id AS id, u.first_name, u.last_name, u.email
      FROM friends f
      JOIN users u ON f.user_id = u.id
      WHERE f.friend_id = $1;
  `;

    const result = await this.connection.query(query, [userId]);
    return result.rows;
  }

  async getFriendById(userId: number, friendId: number) {
    const query = `
      SELECT u.id, u.first_name, u.last_name, u.email
      FROM friends f
           JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = $1 AND f.friend_id = $2
      LIMIT 1;
    `;

    const result = await this.connection.query(query, [userId, friendId]);

    if (result.rows.length === 0) {
      throw new NotFoundException({ message: 'Friend not found.' });
    }

    return result.rows[0];
  }
}
