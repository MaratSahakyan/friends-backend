import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DatabaseModule } from '../src/database/database.module';
import { AuthModule } from '../src/auth/auth.module';
import { Pool } from 'pg';
import { ConfigModule } from '@nestjs/config';
import configuration from '../src/config/configuration';
import { DATABASE_POOL } from '../src/database/database.service';

let app: INestApplication;
let connection: Pool;

describe('AuthController (e2e)', () => {
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
          load: [configuration],
        }),
        AuthModule,
        DatabaseModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    connection = moduleFixture.get<Pool>(DATABASE_POOL);

    await clearTestDb();

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

  it('should register a new user', async () => {
    const createUserDto = {
      first_name: 'John-12',
      last_name: 'Doe-12',
      age: 25,
      email: 'john.12.doe@example.com',
      password: 'Password123!',
    };

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(createUserDto)
      .expect(201);

    expect(response.body).toEqual({
      message: 'You are registered successfully.',
    });

    const result = await connection.query(
      'SELECT * FROM users WHERE email = $1',
      ['john.12.doe@example.com'],
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].email).toBe('john.12.doe@example.com');
  });

  it('should login with valid credentials', async () => {
    const createUserDto = {
      first_name: 'John-13',
      last_name: 'Doe-13',
      age: 30,
      email: 'john.13.doe@example.com',
      password: 'Password123!',
    };

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(createUserDto)
      .expect(201);

    const loginUserDto = {
      email: 'john.13.doe@example.com',
      password: 'Password123!',
    };

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginUserDto)
      .expect(200);

    expect(response.body.tokens).toBeDefined();
    expect(response.body.tokens.accessToken).toBeDefined();
    expect(response.body.tokens.refreshToken).toBeDefined();
  });
});
