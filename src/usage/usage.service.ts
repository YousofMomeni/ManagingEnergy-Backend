// src/usage/usage.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usage } from './entities/usage.entity';
import { Station } from '../station/entities/station.entity';

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(Usage)
    private usageRepository: Repository<Usage>,
    @InjectRepository(Station)
    private stationRepository: Repository<Station>,
  ) {}

  async addUsage(data: {
    stationId: number;
    value: number;
    unit: string;
  }): Promise<Usage> {
    const station = await this.stationRepository.findOne({
      where: { id: data.stationId },
    });
    if (!station) {
      throw new NotFoundException(
        `Station with ID ${data.stationId} not found`,
      );
    }

    const usage = this.usageRepository.create({
      station,
      value: data.value,
      unit: data.unit,
    });
    return this.usageRepository.save(usage);
  }

  async getStationUsage(stationId: number): Promise<Usage[]> {
    return this.usageRepository.find({
      where: { station: { id: stationId } },
      relations: { station: true },
      order: { timestamp: 'DESC' },
    });
  }

  async removeUsage(id: number): Promise<void> {
    const result = await this.usageRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Usage with ID ${id} not found`);
    }
  }
}
