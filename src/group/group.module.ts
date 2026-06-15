// src/group/group.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { Group } from './entities/group.entity';
import { Station } from '../station/entities/station.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Group, Station])],
  controllers: [GroupController],
  providers: [GroupService],
})
export class GroupModule {}