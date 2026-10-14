import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');

export function loadPersistedMap<T>(fileName: string): Map<string, T[]> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const filePath = path.join(DATA_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      return new Map<string, T[]>();
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    const map = new Map<string, T[]>();
    for (const [key, val] of Object.entries(parsed)) {
      if (Array.isArray(val)) {
        map.set(key, val as T[]);
      }
    }
    return map;
  } catch (err) {
    console.warn(`[Persistence] Failed to read ${fileName}:`, err);
    return new Map<string, T[]>();
  }
}

export function savePersistedMap<T>(fileName: string, map: Map<string, T[]>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const filePath = path.join(DATA_DIR, fileName);
    const tempPath = `${filePath}.tmp`;
    const obj: Record<string, T[]> = {};
    for (const [key, val] of map.entries()) {
      obj[key] = val;
    }
    fs.writeFileSync(tempPath, JSON.stringify(obj, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`[Persistence] Failed to write ${fileName}:`, err);
  }
}
