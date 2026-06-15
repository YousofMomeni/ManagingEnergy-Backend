// src/group/dto/create-group.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({ example: 'East Coast Stations', description: 'Group name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ 
    example: [1, 2, 3], 
    description: 'Array of station IDs',
    type: [Number]
  })
  @IsArray()
  @IsNumber({}, { each: true })
  stationIds: number[];
}

export class AddStationsDto {
  @ApiProperty({ 
    example: [4, 5], 
    description: 'Array of station IDs to add',
    type: [Number]
  })
  @IsArray()
  @IsNumber({}, { each: true })
  stationIds: number[];
}