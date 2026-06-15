// src/station/station.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { StationService } from './station.service';
import { CreateStationDto } from './dto/create-station.dto';

@ApiTags('Stations')
@ApiBearerAuth()
@Controller('stations')
export class StationController {
  constructor(private readonly stationService: StationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new station' })
  @ApiResponse({ status: 201, description: 'Station successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createStationDto: CreateStationDto) {
    return this.stationService.create(createStationDto);
  }

  @Get()  // No @Public() decorator - requires token
  @ApiOperation({ summary: 'Get all stations' })
  @ApiResponse({ status: 200, description: 'Return all stations' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll() {
    return this.stationService.findAll();
  }

  @Get(':id')  // No @Public() decorator - requires token
  @ApiOperation({ summary: 'Get station by ID' })
  @ApiParam({ name: 'id', description: 'Station ID' })
  @ApiResponse({ status: 200, description: 'Return the station' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Station not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.stationService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update station' })
  @ApiParam({ name: 'id', description: 'Station ID' })
  @ApiResponse({ status: 200, description: 'Station successfully updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Station not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateStationDto: CreateStationDto) {
    return this.stationService.update(id, updateStationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete station' })
  @ApiParam({ name: 'id', description: 'Station ID' })
  @ApiResponse({ status: 200, description: 'Station successfully deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Station not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.stationService.remove(id);
  }
}