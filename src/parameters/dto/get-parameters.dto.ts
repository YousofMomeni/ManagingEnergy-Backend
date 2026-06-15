// fajr_test_gemini/backend/src/parameters/dto/get-parameters.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GetParametersDto {
  @ApiProperty({ example: 'usualParameters' })
  @IsString()
  @IsNotEmpty()
  name_tab: string;

  @ApiProperty({ example: '2025_09_09' })
  @IsString()
  @IsNotEmpty()
  time_tab: string;

  @ApiProperty({ example: '192.168.1.1' })
  @IsString()
  @IsNotEmpty()
  ip_device: string;

  @ApiProperty({ example: '502' })
  @IsString()
  @IsNotEmpty()
  port_device: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  parameter?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  start_date?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  end_date?: string;
  
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  over_v?: string;
  
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  under_v?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  under_i?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  over_i?: string;

  // Legacy optional fields for diagram/wave/csv
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  start_clock?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  end_clock?: string;

  @ApiProperty({ required: false, description: 'Columns to export (array or comma-separated string)' })
  @IsOptional()
  columns?: any;
}
