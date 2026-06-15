// backend/src/modbus-proxy/modbus-proxy.module.ts
import { Module } from '@nestjs/common';
import { ModbusProxyController } from './modbus-proxy.controller';
import { ModbusProxyService } from './modbus-proxy.service';
import { DataLoggingModule } from '../data-logging/data-logging.module';

@Module({
  imports: [DataLoggingModule],
  controllers: [ModbusProxyController],
  providers: [ModbusProxyService],
})
export class ModbusProxyModule {}

