// fajr_test_gemini/backend/src/parameters/parameters.module.ts
import { Module } from '@nestjs/common';
import { ParametersController } from './parameters.controller';
import { ParametersService } from './parameters.service';
import { LegacyParametersController } from './legacy-parameters.controller';

@Module({
  controllers: [ParametersController, LegacyParametersController],
  providers: [ParametersService],
})
export class ParametersModule {}
