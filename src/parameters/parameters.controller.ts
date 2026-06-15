// fajr_test_gemini/backend/src/parameters/parameters.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ParametersService } from './parameters.service';
import { GetParametersDto } from './dto/get-parameters.dto';

@ApiTags('Parameters')
@ApiBearerAuth()
@Controller('parameters')
export class ParametersController {
  constructor(private readonly parametersService: ParametersService) {}

  @Post()
  @ApiOperation({ summary: 'Get parameters from a device based on tab name' })
  getParameters(@Body() getParametersDto: GetParametersDto) {
    return this.parametersService.getParameters(getParametersDto);
  }
}

