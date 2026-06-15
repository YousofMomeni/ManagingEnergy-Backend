// src/station/dto/create-station.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsNotEmpty, IsIP, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class LocationDto {
  @ApiProperty({ example: 40.7128, description: 'Latitude' })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: -74.0060, description: 'Longitude' })
  @IsNumber()
  lng: number;
}

export class CreateStationDto {
  @ApiProperty({ example: 'Weather Station NYC', description: 'Station name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ 
    example: { lat: 40.7128, lng: -74.0060 }, 
    description: 'Station location coordinates' 
  })
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({ example: 'weather', description: 'Station type' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 'WS001', description: 'Unique serial number' })
  @IsString()
  @IsNotEmpty()
  serialNo: string;

  @ApiProperty({ example: '192.168.1.100', description: 'Station IP address' })
  @IsIP()
  ip: string;

  @ApiProperty({ example: 8080, description: 'Station port number' })
  @IsNumber()
  port: number;
}