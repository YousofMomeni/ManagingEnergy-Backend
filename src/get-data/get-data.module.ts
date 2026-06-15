// src/get-data/get-data.module.ts
import { Module } from '@nestjs/common';
import { GetDataController } from './get-data.controller';
import { GetDataService } from './get-data.service';

@Module({
  controllers: [GetDataController],
  providers: [GetDataService],
})
export class GetDataModule {}