// backend/src/common/register-map.util.ts
export type RegisterLeaf = number;
export type RegisterTree = { [key: string]: RegisterTree | RegisterLeaf };

export type RegisterMetadataLeaf = {
  measurement?: string;
  unit?: string;
  format?: string;
  scale?: string;
  comment?: string;
};

export type RegisterMetadataTree = { [key: string]: RegisterMetadataTree | RegisterMetadataLeaf };

export interface RegisterConfigSection {
  registers?: RegisterTree;
  metadata?: RegisterMetadataTree;
}

export interface RegisterConfig {
  map?: RegisterConfigSection;
  usualParameters?: RegisterConfigSection;
  harmonicParameters?: RegisterConfigSection;
}

export const FALLBACK_MAP_KEY_REGISTERS: Record<string, number> = {
  i_t: 111,
  vl_t: 103,
  p_t: 115,
  q_t: 119,
  pf_t: 127,
};

export interface RegisterDescriptor {
  path: string[];
  register: number;
  csvKey: string;
}

export function buildCombinedRegisterDescriptors(config?: RegisterConfig): RegisterDescriptor[] {
  const fallbackMap: RegisterTree = {};
  for (const [key, register] of Object.entries(FALLBACK_MAP_KEY_REGISTERS)) {
    fallbackMap[key] = register;
  }

  const combinedRoot: RegisterTree = {};
  const mapRegisters = (config?.map?.registers ?? {}) as RegisterTree;
  combinedRoot.map = Object.keys(mapRegisters).length ? mapRegisters : fallbackMap;

  const usualRegisters = (config?.usualParameters?.registers ?? {}) as RegisterTree;
  if (Object.keys(usualRegisters).length) {
    combinedRoot.usualParameters = usualRegisters;
  }

  const harmonicRegisters = (config?.harmonicParameters?.registers ?? {}) as RegisterTree;
  if (Object.keys(harmonicRegisters).length) {
    combinedRoot.harmonicParameters = harmonicRegisters;
  }

  return flattenRegisterTree(combinedRoot).map(({ path, register }) => ({
    path,
    register,
    csvKey: path.join('.'),
  }));
}

export function groupDescriptorsByRegister(descriptors: RegisterDescriptor[]): Record<number, RegisterDescriptor[]> {
  const grouped: Record<number, RegisterDescriptor[]> = {};
  for (const descriptor of descriptors) {
    if (!grouped[descriptor.register]) {
      grouped[descriptor.register] = [];
    }
    grouped[descriptor.register].push(descriptor);
  }
  return grouped;
}
export function flattenRegisterTree(tree?: RegisterTree, path: string[] = []): Array<{ path: string[]; register: number }> {
  if (!tree || typeof tree !== 'object') return [];
  const entries: Array<{ path: string[]; register: number }> = [];
  for (const [key, value] of Object.entries(tree)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      entries.push({ path: [...path, key], register: value });
    } else if (value && typeof value === 'object') {
      entries.push(...flattenRegisterTree(value as RegisterTree, [...path, key]));
    }
  }
  return entries;
}

export function buildKeyRegisterMap(tree?: RegisterTree, fallback: Record<string, number> = {}): Record<string, number> {
  const entries = flattenRegisterTree(tree);
  if (!entries.length) return { ...fallback };
  const result: Record<string, number> = {};
  for (const entry of entries) {
    const key = entry.path[entry.path.length - 1];
    if (!(key in result)) {
      result[key] = entry.register;
    }
  }
  return result;
}

export function collectRegisters(tree?: RegisterTree): number[] {
  const entries = flattenRegisterTree(tree);
  const set = new Set<number>();
  for (const entry of entries) {
    set.add(entry.register);
  }
  return Array.from(set);
}

export function createRegisterPathLookup(tree?: RegisterTree): Record<number, string[][]> {
  const lookup: Record<number, string[][]> = {};
  for (const entry of flattenRegisterTree(tree)) {
    if (!lookup[entry.register]) {
      lookup[entry.register] = [];
    }
    lookup[entry.register].push(entry.path);
  }
  return lookup;
}

export function coerceRegisterValue(entry: unknown): number | undefined {
  if (entry === null || entry === undefined) return undefined;
  if (typeof entry === 'object') {
    const candidate = entry as Record<string, unknown>;
    if ('scaled' in candidate && Number.isFinite(Number(candidate.scaled))) {
      return Number(candidate.scaled);
    }
    if ('value' in candidate && Number.isFinite(Number(candidate.value))) {
      return Number(candidate.value);
    }
    if ('raw' in candidate && Number.isFinite(Number(candidate.raw))) {
      return Number(candidate.raw);
    }
  }
  const num = Number(entry);
  return Number.isFinite(num) ? num : undefined;
}
