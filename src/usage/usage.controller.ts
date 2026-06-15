// src/usage/usage.controller.ts
import { Controller, Post, Delete, Body, Param, Get, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { UsageService } from './usage.service';
import { CreateUsageDto } from './dto/create-usage.dto';

@ApiTags('Usage')
@ApiBearerAuth()
@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Post()
  @ApiOperation({ summary: 'Add usage data for a station' })
  @ApiBody({ type: CreateUsageDto })
  @ApiResponse({ status: 201, description: 'Usage data successfully added' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  addUsage(@Body() body: CreateUsageDto) {
    return this.usageService.addUsage({
      stationId: Number(body.stationId),
      value: body.value,
      unit: body.unit
    });
  }

  @Get('station/:stationId')  // Protected - requires token
  @ApiOperation({ summary: 'Get usage history for a station' })
  @ApiParam({ name: 'stationId', description: 'Station ID' })
  @ApiResponse({ status: 200, description: 'Return usage history' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStationUsage(@Param('stationId', ParseIntPipe) stationId: number) {
    return this.usageService.getStationUsage(stationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete usage record' })
  @ApiParam({ name: 'id', description: 'Usage record ID' })
  @ApiResponse({ status: 200, description: 'Usage record successfully deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  removeUsage(@Param('id', ParseIntPipe) id: number) {
    return this.usageService.removeUsage(id);
  }
}