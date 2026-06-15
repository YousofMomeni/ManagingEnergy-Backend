// src/map/map.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { MapService } from './map.service';

@ApiTags('Map')
@ApiBearerAuth()
@Controller('map')
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get('tiles')  // Protected - requires token
  @ApiOperation({ summary: 'Load map tiles' })
  @ApiQuery({ name: 'lat', required: true, type: Number, example: 40.7128 })
  @ApiQuery({ name: 'lng', required: true, type: Number, example: -74.0060 })
  @ApiQuery({ name: 'zoom', required: true, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Return map tile data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async loadMapTiles(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('zoom') zoom: number,
  ) {
    return this.mapService.loadTiles(lat, lng, zoom);
  }
}