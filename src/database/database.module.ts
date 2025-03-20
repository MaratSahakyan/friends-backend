import { Module, Global } from '@nestjs/common';
import { DATABASE_POOL, DatabaseService } from './database.service';

@Global()
@Module({
  providers: [DatabaseService, DatabaseService.DATABASE_POOL],
  exports: [DatabaseService, DATABASE_POOL],
})
export class DatabaseModule {}
