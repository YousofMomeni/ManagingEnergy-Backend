// backend/src/modbus-proxy/modbus-proxy.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { DataLoggingService } from '../data-logging/data-logging.service';
import {
  buildKeyRegisterMap,
  collectRegisters,
  coerceRegisterValue,
  FALLBACK_MAP_KEY_REGISTERS,
  RegisterConfig,
} from '../common/register-map.util';

type MapStatus = Record<string, number> & {
  i_t: number;
  vl_t: number;
  p_t: number;
  q_t: number;
  pf_t: number;
};

@Injectable()
export class ModbusProxyService {
  private readonly logger = new Logger(ModbusProxyService.name);
  private readonly modbusBase: string;
  private readonly readMetersUrl: string;
  private readonly registerLogsDir: string;
  private readonly mapKeyToRegister: Record<string, number>;
  private readonly mapRegisterList: number[];

  constructor(
    private readonly dataLoggingService: DataLoggingService,
    private readonly configService: ConfigService,
  ) {
    // Load configuration from central config service
    const registerConfigData = this.configService.get<RegisterConfig>(
      'registerMap',
      {},
    );
    const mapRegistersTree = registerConfigData.map?.registers;
    this.mapKeyToRegister = buildKeyRegisterMap(
      mapRegistersTree,
      FALLBACK_MAP_KEY_REGISTERS,
    );
    const resolvedMapRegisters = collectRegisters(mapRegistersTree);
    this.mapRegisterList = resolvedMapRegisters.length
      ? resolvedMapRegisters
      : Object.values(FALLBACK_MAP_KEY_REGISTERS);

    // Load modbus configuration
    this.modbusBase = this.configService.get<string>(
      'modbus.apiUrl',
      'http://localhost:3000',
    );
    this.readMetersUrl = `${this.modbusBase.replace(/\/$/, '')}/read-meters`;
    this.registerLogsDir = path.resolve(process.cwd(), 'register_logs');
    if (!fs.existsSync(this.registerLogsDir)) {
      fs.mkdirSync(this.registerLogsDir, { recursive: true });
    }
  }

  async readRegisters(
    ip: string,
    registers: number[],
    ports?: number[],
    scaleFactor = 100,
  ) {
    // Use read-meters for consistency; returns { [ip]: { [port]: { [reg]: number|{raw,scaled}|{error} } } }
    const response = await axios.post(
      this.readMetersUrl,
      {
        ip_list: [ip],
        register_list: registers,
      },
      {
        proxy: false,
      },
    );
    const results = response.data?.[ip] || {};
    // Optionally filter ports
    if (Array.isArray(ports) && ports.length) {
      const filtered: any = {};
      for (const p of ports) if (results[p]) filtered[p] = results[p];
      return filtered;
    }
    return results;
  }

  async getMapStatus(ip: string, port: number, scaleFactor = 100) {
    const results = await this.readRegisters(
      ip,
      this.mapRegisterList,
      undefined,
      scaleFactor,
    );
    const portKeys = Object.keys(results);
    const item =
      results[port] || (portKeys.length ? results[portKeys[0]] : undefined);
    if (!item) {
      throw new Error(`No data returned for ${ip}:${port}`);
    }

    const statusValues: Record<string, number> = {};
    for (const [key, register] of Object.entries(this.mapKeyToRegister)) {
      const entry = item[register] ?? item[String(register)];
      const value = coerceRegisterValue(entry);
      statusValues[key] = Number.isFinite(value) ? (value as number) : 0;
    }

    const status: MapStatus = {
      i_t: statusValues.i_t ?? 0,
      vl_t: statusValues.vl_t ?? 0,
      p_t: statusValues.p_t ?? 0,
      q_t: statusValues.q_t ?? 0,
      pf_t: statusValues.pf_t ?? 0,
      ...statusValues,
    };
    return status;
  }

  async logStatusToCsv(
    ip: string,
    port: number,
    status: {
      i_t: number;
      vl_t: number;
      p_t: number;
      q_t: number;
      pf_t: number;
    },
  ) {
    const timestamp = new Date().toISOString();
    await this.dataLoggingService.appendStatusRecords([
      {
        timestamp,
        ip,
        port,
        i_t: status.i_t,
        vl_t: status.vl_t,
        p_t: status.p_t,
        q_t: status.q_t,
        pf_t: status.pf_t,
      },
    ]);
  }

  private getRegisterLogFilename(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return path.join(this.registerLogsDir, `${year}-${month}-${day}.csv`);
  }

  async appendRegisterSamples(ip: string, data: Record<string, any>) {
    // Data shape: { [port]: { [register]: number | { raw, scaled } | { error } } }
    const filePath = this.getRegisterLogFilename();
    const fileExists = fs.existsSync(filePath);
    const headers = [
      'Timestamp',
      'IP',
      'Port',
      'Register',
      'Raw',
      'Scaled',
      'Error',
    ];
    const lines: string[] = [];
    if (!fileExists) {
      lines.push(headers.join(','));
    }
    const timestamp = new Date().toISOString();
    for (const port of Object.keys(data)) {
      const portData = data[port] || {};
      for (const reg of Object.keys(portData)) {
        const entry = portData[reg];
        let raw = '';
        let scaled = '';
        let err = '';
        if (typeof entry === 'object' && entry !== null) {
          raw = (entry.raw ?? '').toString();
          scaled = (entry.scaled ?? '').toString();
          err = entry.error ? String(entry.error).replace(/\r?\n|,/g, ' ') : '';
        } else if (Number.isFinite(Number(entry))) {
          scaled = Number(entry).toString();
        }
        lines.push([timestamp, ip, port, reg, raw, scaled, err].join(','));
      }
    }
    await fs.promises.appendFile(filePath, lines.join('\n') + '\n');
  }
}
