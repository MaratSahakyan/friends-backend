import * as process from 'process';
import { config } from 'dotenv';
import { IConfig } from './types';

config();

export default () =>
  ({
    app: {
      port: parseInt(process.env.APP_PORT, 10) || 8000,
    },
    db: {
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    },
  }) as IConfig;
