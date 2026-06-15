// backend/src/data-logging/data-logging.module.ts
import { Module } from '@nestjs/common';
import { DataLoggingService } from './data-logging.service';

@Module({
  providers: [DataLoggingService],
  exports: [DataLoggingService],
})
export class DataLoggingModule {}

