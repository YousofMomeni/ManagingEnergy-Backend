// backend/src/parameters/legacy-parameters.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParametersService } from './parameters.service';
import { GetParametersDto } from './dto/get-parameters.dto';

// Backward-compatible endpoint expected by legacy frontend calls: 'api/GetParameters/'
@ApiTags('Parameters')
@ApiBearerAuth()
@Controller('api')
export class LegacyParametersController {
  constructor(private readonly parametersService: ParametersService) {}

  @Post('GetParameters')
  @ApiOperation({ summary: 'Legacy: unified parameters endpoint for diagram/wave/csv' })
  getParameters(@Body() dto: GetParametersDto) {
    return this.parametersService.getParameters(dto);
  }
}

