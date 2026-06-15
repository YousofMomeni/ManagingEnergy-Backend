// src/usage/dto/create-usage.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsNotEmpty } from 'class-validator';

export class CreateUsageDto {
  @ApiProperty({ example: 1, description: 'Station ID' })
  @IsNumber()
  stationId: number;

  @ApiProperty({ example: 75.5, description: 'Usage value' })
  @IsNumber()
  value: number;

  @ApiProperty({ example: 'kWh', description: 'Unit of measurement' })
  @IsString()
  @IsNotEmpty()
  unit: string;
}