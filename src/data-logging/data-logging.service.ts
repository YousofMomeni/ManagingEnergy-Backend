// backend/src/data-logging/data-logging.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import {
  buildCombinedRegisterDescriptors,
  coerceRegisterValue,
  groupDescriptorsByRegister,
  RegisterConfig,
  RegisterDescriptor,
} from '../common/register-map.util';

@Injectable()
export class DataLoggingService implements OnModuleInit {
  private readonly logger = new Logger(DataLoggingService.name);
  private readonly logInterval: number;
  private readonly dataDir: string;
  private readonly modbusBase: string;
  private readonly readMetersUrl: string;
  private readonly registerDescriptors: RegisterDescriptor[];
  private readonly registerToDescriptors: Record<number, RegisterDescriptor[]>;
  private readonly registersToPoll: number[];
  private readonly csvValueHeaders: { id: string; title: string }[];
  private deviceIPs: string[] = [];
  private isInitialized = false;
  private modbusUnavailableLogged = false;

  constructor(private readonly configService: ConfigService) {
    const registerConfig = this.configService.get<RegisterConfig>(
      'registerMap',
      { infer: true },
    );
    this.registerDescriptors = buildCombinedRegisterDescriptors(registerConfig);
    if (!this.registerDescriptors.length) {
      this.logger.error(
        'No register descriptors could be built from registerMap configuration. Data logging will be disabled.',
      );
      this.registerToDescriptors = {};
      this.registersToPoll = [];
      this.csvValueHeaders = [];
      this.logInterval = this.configService.get<number>(
        'backend.logInterval',
        20000,
      );
      this.dataDir = path.resolve(process.cwd(), 'station_data');
      this.modbusBase = this.configService.get<string>(
        'modbus.apiUrl',
        'http://localhost:3000',
      );
      this.readMetersUrl = `${this.modbusBase.replace(/\/$/, '')}/read-meters`;
      return;
    }

    this.registerToDescriptors = groupDescriptorsByRegister(
      this.registerDescriptors,
    );
    this.registersToPoll = Object.keys(this.registerToDescriptors)
      .map((key) => Number(key))
      .filter((num) => Number.isFinite(num))
      .sort((a, b) => a - b);

    this.csvValueHeaders = this.registerDescriptors.map((descriptor) => ({
      id: descriptor.csvKey,
      title: descriptor.csvKey,
    }));

    if (!this.registersToPoll.length) {
      this.logger.error(
        'No registers resolved from configuration. Data logging will be disabled.',
      );
      this.logInterval = this.configService.get<number>(
        'backend.logInterval',
        20000,
      );
      this.dataDir = path.resolve(process.cwd(), 'station_data');
      this.modbusBase = this.configService.get<string>(
        'modbus.apiUrl',
        'http://localhost:3000',
      );
      this.readMetersUrl = `${this.modbusBase.replace(/\/$/, '')}/read-meters`;
      return;
    }

    this.logInterval = this.configService.get<number>(
      'backend.logInterval',
      20000,
    );
    this.dataDir = path.resolve(process.cwd(), 'station_data');
    this.modbusBase = this.configService.get<string>(
      'modbus.apiUrl',
      'http://localhost:3000',
    );
    this.readMetersUrl = `${this.modbusBase.replace(/\/$/, '')}/read-meters`;
    this.isInitialized = true;
  }

  onModuleInit() {
    if (!this.isInitialized) return;

    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
    } catch (e) {
      this.logger.error(
        `Failed to ensure data directory ${this.dataDir}: ${e instanceof Error ? e.message : e}`,
      );
    }

    this.deviceIPs = this.configService.get<string[]>(
      'backend.logging.deviceIPs',
      [],
    );

    if (!this.deviceIPs || this.deviceIPs.length === 0) {
      this.logger.warn(
        'No device IPs are configured for data logging. Service will not run.',
      );
      this.isInitialized = false;
      return;
    }

    this.startLogging();
  }

  private startLogging() {
    this.logger.log(
      `Starting data logging service for IPs: ${this.deviceIPs.join(', ')}`,
    );
    setInterval(() => this.logData(), this.logInterval);
    this.logData();
  }

  private getTodaysLogFilename(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return path.join(this.dataDir, `${year}-${month}-${day}.csv`);
  }

  private createEmptyRecord(
    timestamp: string,
    ip: string,
    port: string | number,
  ): Record<string, string | number> {
    const base: Record<string, string | number> = {
      timestamp,
      ip,
      port,
    };
    for (const descriptor of this.registerDescriptors) {
      base[descriptor.csvKey] = 0;
    }
    return base;
  }

  private async logData() {
    if (
      !this.isInitialized ||
      !this.deviceIPs.length ||
      !this.registersToPoll.length
    ) {
      return;
    }

    this.logger.log('Scanning for active stations...');
    const timestamp = new Date().toISOString();

    try {
      const response = await axios.post(
        this.readMetersUrl,
        {
          ip_list: this.deviceIPs,
          register_list: this.registersToPoll,
        },
        {
          proxy: false,
        },
      );
      if (this.modbusUnavailableLogged) {
        this.logger.log(
          `Modbus service is available again at ${this.readMetersUrl}.`,
        );
        this.modbusUnavailableLogged = false;
      }

      const results = response.data || {};
      const records: Array<Record<string, string | number>> = [];

      for (const ip of Object.keys(results)) {
        const perIp = results[ip] || {};
        for (const port of Object.keys(perIp)) {
          const data = perIp[port] || {};
          const record = this.createEmptyRecord(timestamp, ip, port);
          let hasResponse = false;

          for (const register of this.registersToPoll) {
            const entry = data[register] ?? data[String(register)];
            if (entry === undefined) {
              continue;
            }
            hasResponse = true;
            const coerced = coerceRegisterValue(entry);
            const value = Number.isFinite(coerced) ? Number(coerced) : 0;
            const descriptors = this.registerToDescriptors[register];
            if (!descriptors) {
              continue;
            }
            for (const descriptor of descriptors) {
              record[descriptor.csvKey] = value;
            }
          }

          if (hasResponse) {
            records.push(record);
          }
        }
      }

      if (!records.length) {
        this.logger.log(
          'No active stations returned register data in this scan.',
        );
        return;
      }

      await this.writeDataToCsv(records);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code)
          : '';
      const hasHttpResponse = Boolean(
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        (error as { response?: unknown }).response,
      );
      const isDependencyUnavailable =
        !hasHttpResponse &&
        ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(code);

      if (isDependencyUnavailable) {
        if (!this.modbusUnavailableLogged) {
          this.logger.warn(
            `Modbus service is unavailable at ${this.readMetersUrl}. Data logging will retry in the background. ${message}`,
          );
          this.modbusUnavailableLogged = true;
        }
        return;
      }

      this.logger.error(`Meter scan failed: ${message}`);
    }
  }

  private async writeDataToCsv(
    records: Array<Record<string, string | number>>,
  ) {
    if (!records.length) {
      return;
    }

    const filePath = this.getTodaysLogFilename();
    const fileExists = fs.existsSync(filePath);

    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
    } catch (e) {
      this.logger.error(
        `Error ensuring CSV directory: ${e instanceof Error ? e.message : e}`,
      );
    }

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'timestamp', title: 'Timestamp' },
        { id: 'ip', title: 'IP' },
        { id: 'port', title: 'Port' },
        ...this.csvValueHeaders,
      ],
      append: fileExists,
    });

    try {
      await csvWriter.writeRecords(records);
      this.logger.log(
        `Successfully wrote ${records.length} records to ${filePath}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error writing to CSV file: ${message}`);
    }
  }

  public async appendStatusRecords(
    records: Array<
      { timestamp: string; ip: string; port: number | string } & Record<
        string,
        any
      >
    >,
  ) {
    if (!this.isInitialized || !Array.isArray(records) || !records.length) {
      return;
    }

    const normalized: Array<Record<string, string | number>> = [];
    for (const record of records) {
      if (!record?.timestamp || !record?.ip || record.port === undefined) {
        continue;
      }
      const csvRecord = this.createEmptyRecord(
        record.timestamp,
        record.ip,
        record.port,
      );

      for (const descriptor of this.registerDescriptors) {
        const csvKey = descriptor.csvKey;
        if (record[csvKey] !== undefined) {
          const directValue = Number(record[csvKey]);
          csvRecord[csvKey] = Number.isFinite(directValue) ? directValue : 0;
          continue;
        }
        const leaf = descriptor.path[descriptor.path.length - 1];
        if (record[leaf] !== undefined) {
          const leafValue = Number(record[leaf]);
          csvRecord[csvKey] = Number.isFinite(leafValue) ? leafValue : 0;
        }
      }

      if (Object.keys(csvRecord).length) {
        normalized.push(csvRecord);
      }
    }

    if (!normalized.length) {
      return;
    }

    await this.writeDataToCsv(normalized);
  }
}
