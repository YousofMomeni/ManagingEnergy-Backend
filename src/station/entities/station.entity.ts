// src/station/entities/station.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Usage } from '../../usage/entities/usage.entity';

@Entity()
export class Station {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('simple-json')
  location: { lat: number; lng: number };

  @Column()
  type: string;

  @Column({ unique: true })
  serialNo: string;

  @Column()
  ip: string;

  @Column()
  port: number;

  @OneToMany(() => Usage, usage => usage.station)
  usages: Usage[];
}