import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  loadHaConfig,
  saveHaFileConfig,
  clearHaFileConfig,
  invalidateHaConfigCache,
} from './server';

let dataDir: string;
const prevUrl = process.env.HOME_ASSISTANT_URL;
const prevToken = process.env.HOME_ASSISTANT_TOKEN;

beforeAll(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'familyos-data-'));
  process.env.FAMILYOS_DATA_DIR = dataDir;
  delete process.env.HOME_ASSISTANT_URL;
  delete process.env.HOME_ASSISTANT_TOKEN;
  invalidateHaConfigCache();
});

afterEach(() => {
  invalidateHaConfigCache();
});

afterAll(async () => {
  invalidateHaConfigCache();
  delete process.env.FAMILYOS_DATA_DIR;
  if (prevUrl === undefined) delete process.env.HOME_ASSISTANT_URL;
  else process.env.HOME_ASSISTANT_URL = prevUrl;
  if (prevToken === undefined) delete process.env.HOME_ASSISTANT_TOKEN;
  else process.env.HOME_ASSISTANT_TOKEN = prevToken;
  await rm(dataDir, { recursive: true, force: true });
});

describe('file-based HA credentials (Settings screen storage)', () => {
  it('saves, loads with source "file", and clears', async () => {
    expect((await loadHaConfig()).config).toBeNull();

    await saveHaFileConfig('http://homeassistant.local:8123', 'tok'.padEnd(40, 'a'));
    const loaded = await loadHaConfig();
    expect(loaded.source).toBe('file');
    expect(loaded.config?.url).toBe('http://homeassistant.local:8123');
    expect(loaded.config?.token).toBe('tok'.padEnd(40, 'a'));

    // Credentials file must be owner-read/write only.
    const stats = await stat(path.join(dataDir, 'ha-config.json'));
    expect(stats.mode & 0o777).toBe(0o600);

    await clearHaFileConfig();
    expect((await loadHaConfig()).config).toBeNull();
  });

  it('falls back to env vars after the file config is removed', async () => {
    process.env.HOME_ASSISTANT_URL = 'http://env-ha.local:8123';
    process.env.HOME_ASSISTANT_TOKEN = 'env'.padEnd(40, 'b');
    invalidateHaConfigCache();

    await saveHaFileConfig('http://file-ha.local:8123', 'file'.padEnd(40, 'c'));
    expect((await loadHaConfig()).source).toBe('file');

    await clearHaFileConfig();
    const loaded = await loadHaConfig();
    expect(loaded.source).toBe('env');
    expect(loaded.config?.url).toBe('http://env-ha.local:8123');
  });

  it('rejects non-http(s) URLs', async () => {
    await expect(saveHaFileConfig('not a url', 'token')).rejects.toThrow('Invalid URL');
    await expect(saveHaFileConfig('ftp://ha.local', 'token')).rejects.toThrow('Invalid URL');
  });
});
