// src/group/group.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { Station } from '../station/entities/station.entity';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(Station)
    private stationRepository: Repository<Station>,
  ) {}

  async createGroup(name: string, stationIds: number[]): Promise<Group> {
    const stations = await this.stationRepository.findBy({
      id: In(stationIds),
    });
    const group = this.groupRepository.create({
      name,
      stations,
      subGroupIds: [],
    });
    return this.groupRepository.save(group);
  }

  async findAll(): Promise<Group[]> {
    return this.groupRepository.find({ relations: { stations: true } });
  }

  async addStations(id: number, stationIds: number[]): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: { stations: true },
    });
    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }
    const newStations = await this.stationRepository.findBy({
      id: In(stationIds),
    });
    group.stations = [...group.stations, ...newStations];
    return this.groupRepository.save(group);
  }

  async removeStations(id: number, stationIds: number[]): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: { stations: true },
    });
    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }
    group.stations = group.stations.filter(
      (station) => !stationIds.includes(station.id),
    );
    return this.groupRepository.save(group);
  }

  async addSubGroup(id: number, subGroupId: number): Promise<Group> {
    const group = await this.groupRepository.findOne({ where: { id } });
    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }
    group.subGroupIds = [...group.subGroupIds, subGroupId];
    return this.groupRepository.save(group);
  }

  async removeSubGroup(id: number, subGroupId: number): Promise<Group> {
    const group = await this.groupRepository.findOne({ where: { id } });
    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }
    group.subGroupIds = group.subGroupIds.filter((gid) => gid !== subGroupId);
    return this.groupRepository.save(group);
  }
}
