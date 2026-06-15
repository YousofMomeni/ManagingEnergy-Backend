// backend/src/modbus-proxy/modbus-proxy.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ModbusProxyService } from './modbus-proxy.service';

@ApiTags('Modbus')
@ApiBearerAuth()
@Controller('modbus')
export class ModbusProxyController {
  constructor(private readonly modbusService: ModbusProxyService) {}

  @Get('read')
  @ApiOperation({ summary: 'Read arbitrary registers from a device across one or more ports' })
  @ApiQuery({ name: 'ip', required: true, description: 'Device IP address' })
  @ApiQuery({ name: 'ports', required: false, description: 'Comma-separated list of ports (e.g., 5011,5012)' })
  @ApiQuery({ name: 'regs', required: true, description: 'Comma-separated list of register addresses (e.g., 100,120,131)' })
  @ApiQuery({ name: 'scale', required: false, description: 'Scale factor divisor (default 100)', example: 100 })
  @ApiQuery({ name: 'log', required: false, description: 'Append results to CSV (true/false)', example: false })
  @ApiResponse({ status: 200, description: 'Returns per-port register values (raw and scaled)' })
  async readRegisters(
    @Query('ip') ip: string,
    @Query('ports') portsCsv?: string,
    @Query('regs') regsCsv?: string,
    @Query('scale') scale?: string,
    @Query('log') log?: string,
  ) {
    const registers = String(regsCsv || '').split(',').map(s => parseInt(s.trim(), 10)).filter(n => Number.isInteger(n));
    if (!ip || !registers.length) {
      throw new Error('Missing ip or regs');
    }
    const ports = (portsCsv ? portsCsv.split(',') : [])
      .map(s => parseInt(s.trim(), 10)).filter(n => Number.isInteger(n));
    const scaleFactor = Number.isFinite(Number(scale)) ? Number(scale) : 100;
    const results = await this.modbusService.readRegisters(ip, registers, ports.length ? ports : undefined, scaleFactor);
    if (String(log).toLowerCase() === 'true') {
      await this.modbusService.appendRegisterSamples(ip, results);
    }
    return { ip, scale_factor: scaleFactor, results };
  }

  @Get('map-status')
  @ApiOperation({ summary: 'Get common map status values (It, Vlt, Pt, Qt, Pf)' })
  @ApiQuery({ name: 'ip', required: true, description: 'Device IP address' })
  @ApiQuery({ name: 'port', required: true, description: 'Device port', example: 5011 })
  @ApiQuery({ name: 'scale', required: false, description: 'Scale factor divisor (default 100)', example: 100 })
  @ApiQuery({ name: 'log', required: false, description: 'Append status snapshot to station CSV (true/false)', example: true })
  @ApiResponse({ status: 200, description: 'Returns i_t, vl_t, p_t, q_t, pf_t' })
  async mapStatus(
    @Query('ip') ip: string,
    @Query('port') portCsv: string,
    @Query('scale') scale?: string,
    @Query('log') log?: string,
  ) {
    const port = parseInt(String(portCsv), 10);
    const scaleFactor = Number.isFinite(Number(scale)) ? Number(scale) : 100;
    const status = await this.modbusService.getMapStatus(ip, port, scaleFactor);
    if (String(log).toLowerCase() === 'true') {
      await this.modbusService.logStatusToCsv(ip, port, status);
    }
    return { ip, port, scale_factor: scaleFactor, ...status };
  }
}

