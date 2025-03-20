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
    await app.close();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  async function clearTestDb() {
    await connection.query('TRUNCATE users RESTART IDENTITY CASCADE;');
  }

  it('should register a new user', async () => {
    const createUserDto = {
      first_name: 'John',
      last_name: 'Doe',
      age: 30,
      email: 'john.doe@example.com',
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
      ['john.doe@example.com'],
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].email).toBe('john.doe@example.com');
  });

  it('should fail to register with duplicate email', async () => {
    const createUserDto = {
      first_name: 'John',
      last_name: 'Doe',
      age: 30,
      email: 'john.doe@example.com',
      password: 'Password123!',
    };

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(createUserDto)
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(createUserDto)
      .expect(400);

    expect(response.body.message).toBe('Wrong Credentials. Please try again');
  });

  it('should login with valid credentials', async () => {
    const createUserDto = {
      first_name: 'John',
      last_name: 'Doe',
      age: 30,
      email: 'john.doe@example.com',
      password: 'Password123!',
    };

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(createUserDto)
      .expect(201);

    const loginUserDto = {
      email: 'john.doe@example.com',
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

  it('should fail to login with invalid credentials', async () => {
    const loginUserDto = {
      email: 'john.doe@example.com',
      password: 'WrongPassword!',
    };

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginUserDto)
      .expect(404);

    expect(response.body.message).toBe('Wrong Credentials.');
  });

  it('should refresh tokens with a valid refresh token', async () => {
    const createUserDto = {
      first_name: 'John',
      last_name: 'Doe',
      age: 30,
      email: 'john.doe@example.com',
      password: 'Password123!',
    };

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(createUserDto)
      .expect(201);

    const loginUserDto = {
      email: 'john.doe@example.com',
      password: 'Password123!',
    };

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginUserDto)
      .expect(200);

    const refreshToken = loginResponse.body.tokens.refreshToken;

    const refreshResponse = await request(app.getHttpServer())
      .get('/auth/refresh')
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(200);

    expect(refreshResponse.body.accessToken).toBeDefined();
    expect(refreshResponse.body.refreshToken).toBeDefined();
  });
});
