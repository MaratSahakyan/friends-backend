import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hashSync } from 'bcrypt';
import { DatabaseService } from '../database/database.service';
import { ICreateUser, IUpdateUser } from "./types";
import { SALT } from '../common/constants';
import { FriendsService } from '../friends/friends.service';
import { FriendRequestStatus } from '../friend-request/types';
import { FriendRequestService } from '../friend-request/friend-request.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly connection: DatabaseService,
    private readonly friendsService: FriendsService,
    private readonly freindRequestService: FriendRequestService,
  ) {}

  async create(body: ICreateUser) {
    const { first_name, last_name, age, email, password } = body;

    const passwordHash = hashSync(password, SALT);

    const query = `
      INSERT INTO users (first_name, last_name, age, email, password_hash) 
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, first_name, last_name, email, created_at;
    `;

    try {
      const result = await this.connection.query(query, [
        first_name,
        last_name,
        age,
        email,
        passwordHash,
      ]);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        let message = 'User with this first and last name already exists.';
        if (error.constraint === 'users_email_key') {
          message = 'User with this email already exists.';
        }
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  async update(userId: number, body: IUpdateUser) {
    const { first_name, last_name, age, email } = body;

    const query = `
      UPDATE users 
      SET 
          first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          age = COALESCE($3, age),
          email = COALESCE($4, email)
      WHERE id = $5 
      RETURNING id, first_name, last_name, email, updated_at;
  `;

    try {
      const result = await this.connection.query(query, [
        first_name,
        last_name,
        age,
        email,
        userId,
      ]);

      if (result.rows.length === 0) {
        throw new NotFoundException('User not found.');
      }

      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        let message = 'User with this first and last name already exists.';
        if (error.constraint === 'users_email_key') {
          message = 'User with this email already exists.';
        }
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  async findByEmail(email: string) {
    const query = `SELECT * FROM users WHERE email = $1;`;
    const user = await this.connection.query(query, [email]);

    return user.rows[0];
  }

  async findByUserId(userId: number) {
    const query = `SELECT * FROM users WHERE id = $1;`;
    const user = await this.connection.query(query, [userId]);

    return user.rows[0];
  }

  async getUsers(search?: string) {
    let query = `SELECT id, first_name, last_name, age FROM users`;
    const params: any[] = [];

    if (search?.trim()) {
      query += ` WHERE LOWER(first_name) LIKE $1 OR LOWER(last_name) LIKE $1 OR age::TEXT LIKE $1`;
      params.push(`%${search.toLowerCase().trim()}%`);
    }

    const users = await this.connection.query(query, params);

    return users.rows.length ? users.rows : [];
  }

  async getUserById(userId: number) {
    const query = `
      SELECT id, first_name, last_name, age
      FROM users
      WHERE id = $1
      LIMIT 1;
  `;

    const result = await this.connection.query(query, [userId]);

    if (result.rows.length === 0) {
      throw new NotFoundException({ message: 'User not found.' });
    }

    return result.rows[0];
  }

  async getFriends(userId: number) {
    return this.friendsService.getFriends(userId);
  }

  async getFriendById(userId: number, friendId: number) {
    return this.friendsService.getFriendById(userId, friendId);
  }

  async getFriendRequests(userId: number) {
    return this.freindRequestService.getFriendRequests(userId);
  }

  async sendFriendRequest(senderId: number, receiverId: number) {
    return this.freindRequestService.sendFriendRequest(senderId, receiverId);
  }

  async respondToFriendRequest(
    receiverId: number,
    senderId: number,
    action: FriendRequestStatus,
  ) {
    return this.freindRequestService.respondToFriendRequest(
      receiverId,
      senderId,
      action,
    );
  }
}
