// src/usage/usage.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';
import { Usage } from './entities/usage.entity';
import { Station } from '../station/entities/station.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Usage, Station])],
  controllers: [UsageController],
  providers: [UsageService],
})
export class UsageModule {}