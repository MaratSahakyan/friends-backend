import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  public pool: Pool;

  constructor(private configService: ConfigService) {
    const dbConfig = configService.get('db');
    this.pool = new Pool(dbConfig);
  }

  async onModuleInit() {
    try {
      const client = await this.pool.connect();
      console.log('Successfully connected to PostgreSQL');
      await this.ensureMigrationsTable();
      await this.runMigrations();
      client.release();
    } catch (error) {
      console.error('Failed to connect to PostgreSQL:', error);
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async query(text: string, params?: any[]) {
    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async ensureMigrationsTable() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  async runMigrations() {
    const migrationsDir = path.join(__dirname, '../../src/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).sort();

    for (const file of migrationFiles) {
      if (file.endsWith('.sql')) {
        const migrationName = file.replace('.sql', '');
        const isExecuted = await this.checkIfMigrationExecuted(migrationName);

        if (!isExecuted) {
          await this.executeMigration(file, migrationsDir, migrationName);
        }
      }
    }

    console.log('All migrations completed successfully');
  }

  private async checkIfMigrationExecuted(
    migrationName: string,
  ): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT * FROM migrations WHERE name = $1;',
      [migrationName],
    );
    return result.rows.length > 0;
  }

  private async executeMigration(
    file: string,
    migrationsDir: string,
    migrationName: string,
  ) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`Running migration: ${file}`);
    await this.pool.query('BEGIN');
    try {
      await this.pool.query(sql);
      await this.pool.query('INSERT INTO migrations (name) VALUES ($1);', [
        migrationName,
      ]);
      await this.pool.query('COMMIT');
    } catch (error) {
      await this.pool.query('ROLLBACK');
      console.error(`Migration failed: ${file}`, error);
      throw error;
    }
  }
}
