import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ConfigLoader {
  private readonly config: Record<string, any>;

  constructor() {
    const configPath = this.resolveConfigPath();
    try {
      const configFile = fs.readFileSync(configPath, 'utf8');
      this.config = JSON.parse(configFile);
    } catch (error) {
      console.error(
        `Error loading configuration from ${configPath}. Please ensure config.json exists.`,
        error
      );
      // In case of an error, provide an empty config to prevent downstream crashes.
      this.config = {};
    }
  }

  private resolveConfigPath(): string {
    const candidates = [
      process.env.CONFIG_PATH,
      path.resolve(process.cwd(), 'config.json'),
      path.resolve(process.cwd(), '..', 'config.json'),
      path.resolve(__dirname, '..', '..', '..', 'config.json'),
    ].filter(Boolean) as string[];

    return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
  }

  // A method to get a specific key from the loaded configuration.
  get(key: string): any {
    return this.config[key];
  }

  // The default export function required by NestJS's ConfigModule.
  static load(): Record<string, any> {
    const loader = new ConfigLoader();
    applyEnvironmentOverrides(loader.config);
    return loader.config;
  }
}

function setIfDefined(
  config: Record<string, any>,
  pathSegments: string[],
  value: string | number | undefined,
) {
  if (value === undefined || value === '') {
    return;
  }

  let cursor = config;
  for (const segment of pathSegments.slice(0, -1)) {
    if (!cursor[segment] || typeof cursor[segment] !== 'object') {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  }
  cursor[pathSegments[pathSegments.length - 1]] = value;
}

function numberFromEnv(value: string | undefined): number | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function applyEnvironmentOverrides(config: Record<string, any>) {
  setIfDefined(config, ['backend', 'host'], process.env.BACKEND_HOST);
  setIfDefined(config, ['backend', 'port'], numberFromEnv(process.env.BACKEND_PORT ?? process.env.PORT));
  setIfDefined(config, ['backend', 'apiBaseUrl'], process.env.BACKEND_API_BASE_URL);
  setIfDefined(config, ['backend', 'databasePath'], process.env.DATABASE_PATH);
  setIfDefined(config, ['backend', 'jwtSecret'], process.env.JWT_SECRET);

  setIfDefined(config, ['modbus', 'host'], process.env.MODBUS_HOST);
  setIfDefined(config, ['modbus', 'port'], numberFromEnv(process.env.MODBUS_PORT));
  setIfDefined(config, ['modbus', 'apiUrl'], process.env.MODBUS_API_URL);
  setIfDefined(config, ['modbus', 'slaveId'], numberFromEnv(process.env.MODBUS_SLAVE_ID));
  setIfDefined(config, ['modbus', 'timeoutMs'], numberFromEnv(process.env.MODBUS_TIMEOUT_MS));
}

export default ConfigLoader.load;
