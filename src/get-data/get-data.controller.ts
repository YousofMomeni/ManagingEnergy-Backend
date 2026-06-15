// src/get-data/get-data.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { GetDataService } from './get-data.service';

@ApiTags('External Data')
@ApiBearerAuth()
@Controller('get-data')
export class GetDataController {
  constructor(private readonly getDataService: GetDataService) {}

  @Get()  // Protected - requires token
  @ApiOperation({ summary: 'Fetch data from external API' })
  @ApiQuery({ name: 'endpoint', required: true, description: 'External API endpoint' })
  @ApiResponse({ status: 200, description: 'Return data from external API' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getData(@Query('endpoint') endpoint: string, @Query() params: any) {
    const { endpoint: _, ...apiParams } = params;
    return this.getDataService.fetchDataFromAPI(endpoint, apiParams);
  }
}