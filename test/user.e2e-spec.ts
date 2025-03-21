import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Pool } from 'pg';
import { ConfigModule } from '@nestjs/config';
import configuration from '../src/config/configuration';
import { JwtService } from '@nestjs/jwt';
import { DATABASE_POOL } from '../src/database/database.service';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let connection: Pool;
  let jwtService: JwtService;
  let authToken: string;
  let userId: number;
  let friendId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
          load: [configuration],
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    connection = moduleFixture.get<Pool>(DATABASE_POOL);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
                                     id SERIAL PRIMARY KEY,
                                     first_name VARCHAR(50) NOT NULL,
                                     last_name VARCHAR(50) NOT NULL,
                                     email VARCHAR(100) UNIQUE NOT NULL,
                                     password_hash VARCHAR(255) NOT NULL,
                                     age INT,
                                     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `);

    await connection.query(`
    CREATE TABLE IF NOT EXISTS friends (
                         id SERIAL PRIMARY KEY,
                         user_id INT NOT NULL,
                         friend_id INT NOT NULL,
                         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                         CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                         CONSTRAINT fk_friend_id FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
                         CONSTRAINT unique_friendship UNIQUE (user_id, friend_id)
    );
`);

    await connection.query(`
    CREATE TABLE IF NOT EXISTS friend_requests (
                                 id SERIAL PRIMARY KEY,
                                 sender_id INT NOT NULL,
                                 receiver_id INT NOT NULL,
                                 status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accept', 'reject')),
                                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                 CONSTRAINT fk_sender_id FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                                 CONSTRAINT fk_receiver_id FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
                                 CONSTRAINT unique_request UNIQUE (sender_id, receiver_id)
    );
    `);

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await clearTestDb();
    await app.close();
  });

  beforeEach(async () => {
    await clearTestDb();

    const user = await connection.query(
      `INSERT INTO users (first_name, last_name, age, email, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id;`,
      ['John', 'Doe', 30, 'john.doe@example.com', 'hashedpassword'],
    );
    userId = user.rows[0].id;

    const friend = await connection.query(
      `INSERT INTO users (first_name, last_name, age, email, password_hash) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id;`,
      ['Jane', 'Doe', 25, 'jane.doe@example.com', 'hashedpassword'],
    );
    friendId = friend.rows[0].id;

    authToken = jwtService.sign(
      { userId },
      { secret: configuration().jwt.accessSecret },
    );
  });

  async function clearTestDb() {
    try {
      await connection.query(
        'TRUNCATE users, friends, friend_requests RESTART IDENTITY CASCADE;',
      );
      console.log('Database cleared.');
    } catch (error) {
      console.error('Error clearing database:', error);
      throw error;
    }
  }

  describe('GET /users', () => {
    it('should return a list of users', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('should return users matching the search query', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?search=John')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /users/user/:userId', () => {
    it('should return a user by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/user/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', userId);
    });

    it('should return 404 if user is not found', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/user/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toBe('User not found.');
    });
  });

  describe('POST /users/friend-request', () => {
    it('should send a friend request', async () => {
      const user = await connection.query(
        `INSERT INTO users (first_name, last_name, age, email, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id;`,
        ['John-25', 'Doe-25', 30, 'john-25.doe@example.com', 'hashedpassword'],
      );
      const senderId = user.rows[0].id;

      const friend = await connection.query(
        `INSERT INTO users (first_name, last_name, age, email, password_hash) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id;`,
        ['Jane-25', 'Doe-25', 25, 'jane.25..doe@example.com', 'hashedpassword'],
      );
      const receiverId = friend.rows[0].id;

      const friendRequestAuthToken = jwtService.sign(
        { userId: senderId },
        { secret: configuration().jwt.accessSecret },
      );

      const response = await request(app.getHttpServer())
        .post('/users/friend-request')
        .set('Authorization', `Bearer ${friendRequestAuthToken}`)
        .send({ receiverId: receiverId })
        .expect(201);

      expect(response.body).toHaveProperty('sender_id', senderId);
      expect(response.body).toHaveProperty('receiver_id', receiverId);
      expect(response.body).toHaveProperty('status', 'pending');
    });

    it('should return 400 if sender and receiver are the same', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/friend-request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ receiverId: userId })
        .expect(400);

      expect(response.body.message).toBe(
        'Sender and receiver cannot be the same.',
      );
    });
  });

  describe('GET /users/friends', () => {
    it('should return a list of friends', async () => {
      await connection.query(
        `INSERT INTO friends (user_id, friend_id) VALUES ($1, $2);`,
        [userId, friendId],
      );

      const response = await request(app.getHttpServer())
        .get('/users/friends')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /users/friend-requests', () => {
    it('should return a list of friend requests', async () => {
      await connection.query(
        `INSERT INTO friend_requests (sender_id, receiver_id, status)
         VALUES ($1, $2, $3);`,
        [userId, friendId, 'pending'],
      );

      const response = await request(app.getHttpServer())
        .get('/users/friend-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('PATCH /users/friend-request/:senderId/respond', () => {
    it('should accept a friend request', async () => {
      await connection.query(
        `INSERT INTO friend_requests (sender_id, receiver_id, status)
         VALUES ($1, $2, $3);`,
        [friendId, userId, 'pending'],
      );

      const response = await request(app.getHttpServer())
        .patch(`/users/friend-request/${friendId}/respond`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ action: 'accept' })
        .expect(200);

      expect(response.body.message).toBe('Friend request accepted.');
    });
  });

  describe('GET /users/friends/:friendId', () => {
    it('should return a friend by ID', async () => {
      await connection.query(
        `INSERT INTO friends (user_id, friend_id) VALUES ($1, $2);`,
        [userId, friendId],
      );

      const response = await request(app.getHttpServer())
        .get(`/users/friends/${friendId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', friendId);
    });

    it('should return 404 if friend is not found', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/friends/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toBe('Friend not found.');
    });
  });
});