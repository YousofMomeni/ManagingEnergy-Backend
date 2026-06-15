// src/user/entities/user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  permission: string;

  @Column({ nullable: true })
  verificationCode: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;
}