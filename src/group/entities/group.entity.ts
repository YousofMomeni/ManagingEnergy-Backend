// src/group/entities/group.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, JoinTable } from 'typeorm';
import { Station } from '../../station/entities/station.entity';

@Entity()
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToMany(() => Station)
  @JoinTable()
  stations: Station[];

  @Column('simple-json', { default: '[]' })
  subGroupIds: number[];
}