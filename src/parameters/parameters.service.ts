// backend/src/parameters/parameters.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import { ConfigService } from '@nestjs/config';
import {
  RegisterConfig,
  RegisterTree,
  RegisterMetadataTree,
  RegisterDescriptor,
  collectRegisters,
  coerceRegisterValue,
  createRegisterPathLookup,
  buildCombinedRegisterDescriptors,
} from '../common/register-map.util';
import { GetParametersDto } from './dto/get-parameters.dto';

@Injectable()
export class ParametersService {
  private readonly logger = new Logger(ParametersService.name);
  private readonly modbusApiBase: string;
  private readonly modbusReadMetersUrl: string;
  private readonly dataDir: string;
  private readonly registerConfig: RegisterConfig;
  private readonly usualParameterRegisters: RegisterTree;
  private readonly harmonicParameterRegisters: RegisterTree;
  private readonly mapRegisters: RegisterTree;
  private readonly mapMetadata: RegisterMetadataTree;
  private readonly usualParameterMetadata: RegisterMetadataTree;
  private readonly harmonicParameterMetadata: RegisterMetadataTree;
  private readonly registerDescriptors: RegisterDescriptor[];
  private readonly csvKeySet: Set<string>;
  private readonly leafToCsvKey: Record<string, string>;
  private readonly mapLeafToCsvKey: Record<string, string>;

  constructor(private readonly configService: ConfigService) {
    // Load configuration from central config service
    this.registerConfig = this.configService.get<RegisterConfig>('registerMap', {});
    this.mapRegisters = (this.registerConfig.map?.registers ?? {}) as RegisterTree;
    this.mapMetadata = (this.registerConfig.map?.metadata ?? {}) as RegisterMetadataTree;
    this.usualParameterRegisters = (this.registerConfig.usualParameters?.registers ?? {}) as RegisterTree;
    this.usualParameterMetadata = (this.registerConfig.usualParameters?.metadata ?? {}) as RegisterMetadataTree;
    this.harmonicParameterRegisters = (this.registerConfig.harmonicParameters?.registers ?? {}) as RegisterTree;
    this.harmonicParameterMetadata = (this.registerConfig.harmonicParameters?.metadata ?? {}) as RegisterMetadataTree;
    this.registerDescriptors = buildCombinedRegisterDescriptors(this.registerConfig);
    this.csvKeySet = new Set(this.registerDescriptors.map(descriptor => descriptor.csvKey));
    this.leafToCsvKey = {};
    this.mapLeafToCsvKey = {};
    const sectionPriority: Record<string, number> = { usualParameters: 0, map: 1, harmonicParameters: 2 };
    for (const descriptor of this.registerDescriptors) {
      const section = descriptor.path[0];
      const leaf = descriptor.path[descriptor.path.length - 1];
      if (section === 'map') {
        this.mapLeafToCsvKey[leaf] = descriptor.csvKey;
      }
      const existing = this.leafToCsvKey[leaf];
      if (!existing) {
        this.leafToCsvKey[leaf] = descriptor.csvKey;
        continue;
      }
      const existingSection = existing.split('.')[0] ?? '';
      const existingPriority = sectionPriority[existingSection] ?? Number.MAX_SAFE_INTEGER;
      const newPriority = sectionPriority[section] ?? Number.MAX_SAFE_INTEGER;
      if (newPriority < existingPriority) {
        this.leafToCsvKey[leaf] = descriptor.csvKey;
      }
    }

    // Load modbus configuration
    this.modbusApiBase = this.configService.get<string>('modbus.apiUrl', 'http://localhost:3000').replace(/\/$/, '');
    this.modbusReadMetersUrl = `${this.modbusApiBase}/read-meters`;
    this.dataDir = path.resolve(process.cwd(), 'station_data');
  }



  async getParameters(getParametersDto: GetParametersDto): Promise<any> {
    const { name_tab, ip_device, port_device, time_tab } = getParametersDto;

    switch (name_tab) {
      case 'map':
        return this.getMapParametersFromCsv(ip_device, port_device, time_tab);

      case 'usualParameters':
        return this.getUsualParameters(ip_device, port_device, time_tab);

      case 'harmonicParameters':
        return this.getHarmonicParameters(ip_device, port_device, time_tab);

      case 'diagram':
        return this.getDiagramSeries(getParametersDto);

      case 'wave':
        return this.getWaveSeries(getParametersDto);

      case 'csv':
        return this.buildCsvExport(getParametersDto);

      case 'events':
        return this.getEvents(getParametersDto);
      
      default:
        throw new NotFoundException(`Parameters for tab '${name_tab}' not found or not implemented.`);
    }
  }

  private toFiniteNumber(value: unknown, fallback = 0): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  private resolveCsvPath(date?: string): string | undefined {
    try {
      const direct = date ? this.getCsvFilenameForDate(date) : undefined;
      if (direct && fs.existsSync(direct)) {
        return direct;
      }
      if (!fs.existsSync(this.dataDir)) {
        return undefined;
      }
      const files = fs.readdirSync(this.dataDir)
        .filter(file => file.toLowerCase().endsWith('.csv'))
        .sort();
      if (!files.length) {
        return undefined;
      }
      const latest = files[files.length - 1];
      return path.join(this.dataDir, latest);
    } catch (error) {
      return undefined;
    }
  }

  private normalizeDateToken(token?: string): string | undefined {
    const trimmed = String(token || '').trim();
    return trimmed.length ? trimmed : undefined;
  }

  private parseDateToken(token?: string): Date | undefined {
    const normalized = this.normalizeDateToken(token);
    if (!normalized) {
      return undefined;
    }
    const iso = normalized.replace(/_/g, '-');
    const parsed = new Date(`${iso}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private formatDateToken(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}_${month}_${day}`;
  }

  private enumerateDateTokens(start?: string, end?: string): Array<string | undefined> {
    const startToken = this.normalizeDateToken(start);
    const endToken = this.normalizeDateToken(end);
    if (!startToken && !endToken) {
      return [undefined];
    }
    const effectiveStart = startToken ?? endToken!;
    const effectiveEnd = endToken ?? startToken!;
    const startDate = this.parseDateToken(effectiveStart);
    const endDate = this.parseDateToken(effectiveEnd);
    if (!startDate || !endDate) {
      return [effectiveStart];
    }
    const results: string[] = [];
    const cursor = new Date(startDate.getTime());
    while (cursor <= endDate) {
      results.push(this.formatDateToken(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return results.length ? results : [effectiveStart];
  }

  private async readLatestCsvRow(ip: string, port: string | number, date?: string): Promise<Record<string, any> | null> {
    const filePath = this.resolveCsvPath(date);
    if (!filePath) {
      return null;
    }
    return new Promise((resolve) => {
      let latest: Record<string, any> | null = null;
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          if (String(row.IP) === String(ip) && String(row.Port) === String(port)) {
            latest = row;
          }
        })
        .on('end', () => resolve(latest))
        .on('error', () => resolve(null));
    });
  }

  private parseCsvRow(row: Record<string, any>): Record<string, any> {
    const structured: Record<string, any> = {};
    for (const descriptor of this.registerDescriptors) {
      const raw = row[descriptor.csvKey];
      if (raw === undefined || raw === null || raw === '') {
        continue;
      }
      const value = this.toFiniteNumber(raw);
      let cursor = structured;
      for (let i = 0; i < descriptor.path.length - 1; i++) {
        const key = descriptor.path[i];
        if (!cursor[key] || typeof cursor[key] !== 'object') {
          cursor[key] = {};
        }
        cursor = cursor[key];
      }
      const leaf = descriptor.path[descriptor.path.length - 1];
      cursor[leaf] = value;
    }
    return structured;
  }

  private async getStructuredSnapshot(ip: string, port: string, date?: string): Promise<Record<string, any>> {
    const row = await this.readLatestCsvRow(ip, port, date);
    if (!row) {
      return {};
    }
    return this.parseCsvRow(row);
  }

  /**
   * Fetches and restructures data from the live Modbus API (fallback when CSV lacks data).
   */
  private async fetchAndStructureDataFromModbus(ip: string, port: string, registerMap: RegisterTree | object | undefined): Promise<any> {
    if (!registerMap || typeof registerMap !== 'object') {
      return {};
    }

    const registerTree = registerMap as RegisterTree;
    const registers = collectRegisters(registerTree);
    if (!registers.length) {
      return {};
    }
    const pathLookup = createRegisterPathLookup(registerTree);

    try {
      this.logger.log(`Fetching ${registers.length} registers for ${ip}:${port} via ${this.modbusReadMetersUrl}...`);
      const response = await axios.post(this.modbusReadMetersUrl, {
        ip_list: [ip],
        register_list: registers,
      });

      const results = response.data || {};
      const ipKey = Object.prototype.hasOwnProperty.call(results, ip) ? ip : Object.keys(results)[0];
      const ipResultRaw = ipKey ? results[ipKey] : undefined;
      if (!ipResultRaw || typeof ipResultRaw !== 'object') {
        this.logger.warn(`No structured IP data returned for ${ip}.`);
        return {};
      }
      const portKey = Object.prototype.hasOwnProperty.call(ipResultRaw, String(port)) ? String(port) : Object.keys(ipResultRaw)[0];
      const portResultRaw = portKey ? ipResultRaw[portKey] : undefined;
      if (!portResultRaw || typeof portResultRaw !== 'object') {
        this.logger.warn(`No structured register data returned for ${ip}:${port}.`);
        return {};
      }

      const structuredData: Record<string, any> = {};
      for (const [registerKey, entry] of Object.entries(portResultRaw)) {
        const register = parseInt(registerKey, 10);
        if (!Number.isInteger(register)) continue;
        const paths = pathLookup[register];
        if (!paths || !paths.length) continue;
        if (entry && typeof entry === 'object' && 'error' in entry) continue;
        if (typeof entry === 'string' && entry.toLowerCase().includes('error')) continue;

        const finalValue = coerceRegisterValue(entry) ?? 0;

        for (const path of paths) {
          let current = structuredData;
          for (let i = 0; i < path.length - 1; i++) {
            const key = path[i];
            if (!current[key] || typeof current[key] !== 'object') {
              current[key] = {};
            }
            current = current[key];
          }
          current[path[path.length - 1]] = finalValue;
        }
      }

      return structuredData;

    } catch (error) {
      const err = error as any;
      let message = '';
      if (error instanceof Error && error.message) {
        message = error.message;
      } else if (typeof error === 'string' && error.trim().length) {
        message = error.trim();
      } else {
        try {
          message = JSON.stringify(error);
        } catch {
          message = String(error);
        }
      }
      const status = err?.response?.status;
      const code = err?.code;
      const data = err?.response?.data;
      const extras: string[] = [];
      if (status) extras.push(`status=${status}`);
      if (code) extras.push(`code=${code}`);
      if (data !== undefined) {
        try {
          extras.push(`data=${JSON.stringify(data)}`);
        } catch {
          extras.push('data=[unserializable]');
        }
      }
      const trimmedMessage = message.trim();
      const extraText = extras.length ? ` (${extras.join(', ')})` : '';
      this.logger.warn(`Modbus fetch failed for ${ip}:${port}: ${trimmedMessage || '[no message]'}${extraText}`);
      return {};
    }
  }


  /**
   * Reads the latest data for the map hover-over from the daily CSV log.
   */
  private async getMapParametersFromCsv(ip: string, port: string, date?: string): Promise<any> {
    const buildResponse = (payload: Record<string, number>) => ({
      ...payload,
      metadata: this.clone(this.mapMetadata) ?? {},
      registers: this.clone(this.mapRegisters) ?? {},
    });

    let mapSection: any = (await this.getStructuredSnapshot(ip, port, date)).map;
    if (!mapSection || typeof mapSection !== 'object' || !Object.keys(mapSection).length) {
      mapSection = await this.fetchAndStructureDataFromModbus(ip, port, this.mapRegisters);
    }

    if (!mapSection || typeof mapSection !== 'object' || !Object.keys(mapSection).length) {
      return buildResponse(this.getDefaultMapParameters());
    }

    const responsePayload = {
      i_t: this.toFiniteNumber(mapSection.i_t),
      vl_t: this.toFiniteNumber(mapSection.vl_t),
      p_t: this.toFiniteNumber(mapSection.p_t),
      q_t: this.toFiniteNumber(mapSection.q_t),
      pf_t: this.toFiniteNumber(mapSection.pf_t),
    };

    return buildResponse(responsePayload);
  }


  private getTodaysLogFilename(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return path.join(this.dataDir, `${year}-${month}-${day}.csv`);
  }

  private getDefaultMapParameters() {
    return { i_t: 0, vl_t: 0, p_t: 0, q_t: 0, pf_t: 0 };
  }

  private mapParamToCsvColumn(param: string): string | undefined {
    const raw = String(param || '').trim();
    if (!raw) {
      return undefined;
    }
    if (this.csvKeySet.has(raw)) {
      return raw;
    }
    if (this.leafToCsvKey[raw]) {
      return this.leafToCsvKey[raw];
    }

    const normalized = raw.replace(/\s+/g, '');
    if (this.csvKeySet.has(normalized)) {
      return normalized;
    }
    if (this.leafToCsvKey[normalized]) {
      return this.leafToCsvKey[normalized];
    }

    const legacy: Record<string, string | undefined> = {
      It: this.mapLeafToCsvKey['i_t'] ?? this.leafToCsvKey['i_t'],
      Vlt: this.mapLeafToCsvKey['vl_t'] ?? this.leafToCsvKey['vl_t'],
      Pt: this.mapLeafToCsvKey['p_t'] ?? this.leafToCsvKey['p_t'],
      Qt: this.mapLeafToCsvKey['q_t'] ?? this.leafToCsvKey['q_t'],
      Pf: this.mapLeafToCsvKey['pf_t'] ?? this.leafToCsvKey['pf_t'],
    };
    if (Object.prototype.hasOwnProperty.call(legacy, raw) && legacy[raw] !== undefined) {
      return legacy[raw];
    }

    return undefined;
  }

  private getCsvFilenameForDate(dateStr: string): string {
    const normalized = String(dateStr || '').replace(/_/g, '-');
    return path.join(this.dataDir, `${normalized}.csv`);
  }

  private async readAllCsvRows(filePath?: string): Promise<any[]> {
    return new Promise((resolve) => {
      const rows: any[] = [];
      if (!filePath || !fs.existsSync(filePath)) return resolve(rows);
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', () => resolve(rows))
        .on('error', () => resolve(rows));
    });
  }

  private extractTimeFromIso(ts: string): string {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  private extractDateFromIso(ts: string): string {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async getDiagramSeries(dto: GetParametersDto): Promise<Record<string, number>> {
    const { ip_device, port_device, time_tab, parameter } = dto;
    const file = this.resolveCsvPath(time_tab);
    const rows = await this.readAllCsvRows(file);
    const col = this.mapParamToCsvColumn(String(parameter));
    const out: Record<string, number> = {};
    if (!col) return out;
    for (const row of rows) {
      if (String(row.IP) === String(ip_device) && String(row.Port) === String(port_device)) {
        const t = this.extractTimeFromIso(row.Timestamp || row.timestamp);
        const val = Number(row[col]);
        if (Number.isFinite(val)) out[t] = val;
      }
    }
    return out;
  }

  private async getWaveSeries(dto: GetParametersDto): Promise<Record<string, Record<string, number>>> {
    const { ip_device, port_device, time_tab } = dto;
    const file = this.resolveCsvPath(time_tab);
    const rows = await this.readAllCsvRows(file);
    const out: Record<string, Record<string, number>> = { i_1: {}, i_2: {}, i_3: {}, v_1: {}, v_2: {}, v_3: {} };

    const currentColumns: Record<string, string | undefined> = {
      i_1: this.leafToCsvKey['i_1'] ?? 'usualParameters.i_tab.i_1',
      i_2: this.leafToCsvKey['i_2'] ?? 'usualParameters.i_tab.i_2',
      i_3: this.leafToCsvKey['i_3'] ?? 'usualParameters.i_tab.i_3',
    };
    const voltageColumns: Record<string, string | undefined> = {
      v_1: this.leafToCsvKey['v_1'] ?? 'usualParameters.v_tab.v_1',
      v_2: this.leafToCsvKey['v_2'] ?? 'usualParameters.v_tab.v_2',
      v_3: this.leafToCsvKey['v_3'] ?? 'usualParameters.v_tab.v_3',
    };

    for (const row of rows) {
      if (String(row.IP) !== String(ip_device) || String(row.Port) !== String(port_device)) {
        continue;
      }
      const t = this.extractTimeFromIso(row.Timestamp || row.timestamp);
      for (const [key, column] of Object.entries(currentColumns)) {
        if (!column) continue;
        const raw = row[column];
        const value = this.toFiniteNumber(raw, Number.NaN);
        if (Number.isFinite(value)) {
          out[key][t] = value;
        }
      }
      for (const [key, column] of Object.entries(voltageColumns)) {
        if (!column) continue;
        const raw = row[column];
        const value = this.toFiniteNumber(raw, Number.NaN);
        if (Number.isFinite(value)) {
          out[key][t] = value;
        }
      }
    }
    return out;
  }

  private async buildCsvExport(dto: GetParametersDto): Promise<string> {
    const { ip_device, port_device, start_date, end_date, start_clock, end_clock, columns } = dto;
    const from = String(start_date || '').trim();
    const to = String(end_date || from).trim();
    const days: string[] = [];
    if (from && to) {
      if (from === to) {
        days.push(from);
      } else {
        days.push(from, to);
      }
    }
    const colList: string[] = Array.isArray(columns)
      ? columns
      : String(columns || '').split(',').map(s => s.trim()).filter(Boolean);
    const mappedCols = colList.map(c => ({ in: c, csv: this.mapParamToCsvColumn(c) })).filter(m => m.csv);
    const header = ['Timestamp', 'IP', 'Port', ...mappedCols.map(m => m.in)].join(',');
    const lines = [header];
    const seenFiles = new Set<string>();
    const effectiveDays = days.length ? days : [undefined];
    for (const day of effectiveDays) {
      const file = this.resolveCsvPath(day);
      if (!file || seenFiles.has(file)) continue;
      seenFiles.add(file);
      const rows = await this.readAllCsvRows(file);
      for (const row of rows) {
        if (String(row.IP) !== String(ip_device) || String(row.Port) !== String(port_device)) continue;
        const t = this.extractTimeFromIso(row.Timestamp || row.timestamp);
        if (start_clock && t < start_clock) continue;
        if (end_clock && t > end_clock) continue;
        const vals = mappedCols.map(m => row[m.csv!] ?? '');
        lines.push([row.Timestamp || row.timestamp, row.IP, row.Port, ...vals].join(','));
      }
    }
    return lines.join('\n');
  }

  private async getEvents(dto: GetParametersDto): Promise<Record<string, any>> {
    const {
      ip_device,
      port_device,
      start_date,
      end_date,
      over_v,
      under_v,
      over_i,
      under_i,
    } = dto;

    const parseThreshold = (value?: string): number | undefined => {
      const num = Number(value);
      return Number.isFinite(num) ? num : undefined;
    };

    const thresholds = {
      overCurrent: parseThreshold(over_i),
      underCurrent: parseThreshold(under_i),
      overVoltage: parseThreshold(over_v),
      underVoltage: parseThreshold(under_v),
    };

    const dateTokens = this.enumerateDateTokens(start_date, end_date);
    const seenFiles = new Set<string>();
    const baseDateToken = this.normalizeDateToken(start_date) ?? this.normalizeDateToken(end_date);
    const eventKeys = [
      'i_1_over',
      'i_1_under',
      'i_2_over',
      'i_2_under',
      'i_3_over',
      'i_3_under',
      'v_1_over',
      'v_1_under',
      'v_2_over',
      'v_2_under',
      'v_3_over',
      'v_3_under',
    ] as const;
    type EventKey = (typeof eventKeys)[number];
    const events: Record<string, any> = {
      date: baseDateToken ? baseDateToken.replace(/_/g, '-') : '',
    };
    for (const key of eventKeys) {
      events[key] = {};
    }
    const counters = Object.fromEntries(eventKeys.map(key => [key, 0])) as Record<EventKey, number>;

    const columnMap: Record<string, string | undefined> = {
      i_1: this.leafToCsvKey['i_1'],
      i_2: this.leafToCsvKey['i_2'],
      i_3: this.leafToCsvKey['i_3'],
      v_1: this.leafToCsvKey['v_1'],
      v_2: this.leafToCsvKey['v_2'],
      v_3: this.leafToCsvKey['v_3'],
    };

    const recordEvent = (key: EventKey, time: string, value: number) => {
      const next = ++counters[key];
      events[key][`evt_${next}`] = [time, value];
    };

    for (const token of dateTokens) {
      const file = this.resolveCsvPath(token);
      if (!file || seenFiles.has(file)) {
        continue;
      }
      seenFiles.add(file);
      const rows = await this.readAllCsvRows(file);
      for (const row of rows) {
        if (String(row.IP) !== String(ip_device) || String(row.Port) !== String(port_device)) {
          continue;
        }
        const timestamp = row.Timestamp || row.timestamp;
        const time = this.extractTimeFromIso(timestamp);
        const dateIso = this.extractDateFromIso(timestamp);
        if (!events.date && dateIso) {
          events.date = dateIso;
        }

        const getNumericValue = (key?: string): number => {
          return key ? this.toFiniteNumber(row[key], Number.NaN) : Number.NaN;
        };

        const currentValues = {
          i_1: getNumericValue(columnMap.i_1),
          i_2: getNumericValue(columnMap.i_2),
          i_3: getNumericValue(columnMap.i_3),
        };
        const voltageValues = {
          v_1: getNumericValue(columnMap.v_1),
          v_2: getNumericValue(columnMap.v_2),
          v_3: getNumericValue(columnMap.v_3),
        };

        if (thresholds.overCurrent !== undefined) {
          if (Number.isFinite(currentValues.i_1) && currentValues.i_1 > thresholds.overCurrent) {
            recordEvent('i_1_over', time, currentValues.i_1);
          }
          if (Number.isFinite(currentValues.i_2) && currentValues.i_2 > thresholds.overCurrent) {
            recordEvent('i_2_over', time, currentValues.i_2);
          }
          if (Number.isFinite(currentValues.i_3) && currentValues.i_3 > thresholds.overCurrent) {
            recordEvent('i_3_over', time, currentValues.i_3);
          }
        }

        if (thresholds.underCurrent !== undefined) {
          if (Number.isFinite(currentValues.i_1) && currentValues.i_1 < thresholds.underCurrent) {
            recordEvent('i_1_under', time, currentValues.i_1);
          }
          if (Number.isFinite(currentValues.i_2) && currentValues.i_2 < thresholds.underCurrent) {
            recordEvent('i_2_under', time, currentValues.i_2);
          }
          if (Number.isFinite(currentValues.i_3) && currentValues.i_3 < thresholds.underCurrent) {
            recordEvent('i_3_under', time, currentValues.i_3);
          }
        }

        if (thresholds.overVoltage !== undefined) {
          if (Number.isFinite(voltageValues.v_1) && voltageValues.v_1 > thresholds.overVoltage) {
            recordEvent('v_1_over', time, voltageValues.v_1);
          }
          if (Number.isFinite(voltageValues.v_2) && voltageValues.v_2 > thresholds.overVoltage) {
            recordEvent('v_2_over', time, voltageValues.v_2);
          }
          if (Number.isFinite(voltageValues.v_3) && voltageValues.v_3 > thresholds.overVoltage) {
            recordEvent('v_3_over', time, voltageValues.v_3);
          }
        }

        if (thresholds.underVoltage !== undefined) {
          if (Number.isFinite(voltageValues.v_1) && voltageValues.v_1 < thresholds.underVoltage) {
            recordEvent('v_1_under', time, voltageValues.v_1);
          }
          if (Number.isFinite(voltageValues.v_2) && voltageValues.v_2 < thresholds.underVoltage) {
            recordEvent('v_2_under', time, voltageValues.v_2);
          }
          if (Number.isFinite(voltageValues.v_3) && voltageValues.v_3 < thresholds.underVoltage) {
            recordEvent('v_3_under', time, voltageValues.v_3);
          }
        }
      }
    }

    if (!events.date && baseDateToken) {
      events.date = baseDateToken.replace(/_/g, '-');
    }

    return events;
  }

  private async getUsualParameters(ip: string, port: string, date?: string): Promise<any> {
    let base: any = (await this.getStructuredSnapshot(ip, port, date)).usualParameters;
    if (!base || typeof base !== 'object' || !Object.keys(base).length) {
      base = await this.fetchAndStructureDataFromModbus(ip, port, this.usualParameterRegisters);
    }
    base = base ?? {};
    const values = this.mergeRegisterValues(this.usualParameterRegisters, base);
    const metadata = this.clone(this.usualParameterMetadata) ?? {};
    const registers = this.clone(this.usualParameterRegisters) ?? {};
    const buildPhaseDefaults = () => ({
      i_1: 0,
      i_2: 0,
      i_3: 0,
      i_t: this.toFiniteNumber(base?.i_tab?.i_t),
    });

    return {
      metadata,
      registers,
      ...values,
      ohd_v: buildPhaseDefaults(),
      thd_v: buildPhaseDefaults(),
      ohd_i: buildPhaseDefaults(),
      ehd_i: buildPhaseDefaults(),
      k_i: buildPhaseDefaults(),
      min_v: buildPhaseDefaults(),
      avg_v: buildPhaseDefaults(),
      thd_i: buildPhaseDefaults(),
    };
  }

  private async getHarmonicParameters(ip: string, port: string, date?: string): Promise<any> {
    let base: any = (await this.getStructuredSnapshot(ip, port, date)).harmonicParameters;
    if (!base || typeof base !== 'object' || !Object.keys(base).length) {
      base = await this.fetchAndStructureDataFromModbus(ip, port, this.harmonicParameterRegisters);
    }
    base = base ?? {};
    const zero = () => { const o: any = {}; for (let i = 2; i <= 22; i++) o[`${i}`] = 0; return o; };
    const pick = (obj: any, type: 'I'|'V', phase: '1'|'2'|'3') => {
      if (!obj || typeof obj !== 'object') return zero();
      const out: any = {};
      for (let i = 2; i <= 22; i++) {
        const key = `${type}${phase}_${i}`;
        out[`${i}`] = this.toFiniteNumber(obj[key]);
      }
      return out;
    };
    return {
      metadata: this.clone(this.harmonicParameterMetadata) ?? {},
      registers: this.clone(this.harmonicParameterRegisters) ?? {},
      i_1_tab: pick(base?.i_1_tab, 'I', '1'),
      i_2_tab: pick(base?.i_2_tab, 'I', '2'),
      i_3_tab: pick(base?.i_3_tab, 'I', '3'),
      v_1_tab: pick(base?.v_1_tab, 'V', '1'),
      v_2_tab: pick(base?.v_2_tab, 'V', '2'),
      v_3_tab: pick(base?.v_3_tab, 'V', '3'),
    };
  }

  private mergeRegisterValues(tree: RegisterTree, baseValues: any): any {
    const output: Record<string, any> = {};
    if (!tree || typeof tree !== 'object') {
      return output;
    }
    for (const [key, value] of Object.entries(tree)) {
      if (typeof value === 'number') {
        const candidate = baseValues?.[key];
        const num = Number(candidate);
        output[key] = Number.isFinite(num) ? num : 0;
      } else if (value && typeof value === 'object') {
        const nextBase = baseValues && typeof baseValues === 'object' ? baseValues[key] : undefined;
        output[key] = this.mergeRegisterValues(value as RegisterTree, nextBase);
      }
    }
    return output;
  }

  private clone<T>(value: T): T {
    if (value === undefined || value === null) {
      return value;
    }
    return JSON.parse(JSON.stringify(value)) as T;
  }
}

