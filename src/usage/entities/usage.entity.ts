// src/usage/entities/usage.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { Station } from '../../station/entities/station.entity';

@Entity()
export class Usage {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Station, station => station.usages)
  station: Station;

  @CreateDateColumn()
  timestamp: Date;

  @Column('float')
  value: number;

  @Column()
  unit: string;
}