import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Server-only Home Assistant access.
 *
 * Credentials come from two sources, in order:
 *   1. File config written by the in-app Settings screen (data/ha-config.json)
 *   2. Environment variables (HOME_ASSISTANT_URL / HOME_ASSISTANT_TOKEN)
 *
 * Neither source ever leaves the server. The token is never logged and
 * never returned by any API route.
 */

export interface ServerHaConfig {
  url: string;
  token: string;
}

export type ConfigSource = 'file' | 'env';

interface FileConfig {
  url: string;
  token: string;
}

let cached: { config: ServerHaConfig | null; source: ConfigSource | null } | undefined;

function dataDir(): string {
  return process.env.FAMILYOS_DATA_DIR || path.join(process.cwd(), 'data');
}

function configPath(): string {
  return path.join(dataDir(), 'ha-config.json');
}

function parseHttpUrl(raw: string): string | null {
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

async function readFileConfig(): Promise<FileConfig | null> {
  try {
    const raw = await fs.readFile(configPath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<FileConfig>;
    if (typeof parsed.url !== 'string' || typeof parsed.token !== 'string') return null;
    const url = parseHttpUrl(parsed.url);
    if (!url || !parsed.token) return null;
    return { url, token: parsed.token };
  } catch {
    // Missing or corrupt file simply means "no file config".
    return null;
  }
}

function readEnvConfig(): ServerHaConfig | null {
  const url = parseHttpUrl(process.env.HOME_ASSISTANT_URL ?? '');
  const token = process.env.HOME_ASSISTANT_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}

export async function loadHaConfig(): Promise<{
  config: ServerHaConfig | null;
  source: ConfigSource | null;
}> {
  if (cached) return cached;

  const file = await readFileConfig();
  if (file) {
    cached = { config: file, source: 'file' };
    return cached;
  }
  const env = readEnvConfig();
  cached = { config: env, source: env ? 'env' : null };
  return cached;
}

export function invalidateHaConfigCache(): void {
  cached = undefined;
}

/** Synchronous view for call sites that cannot await (routes mostly can). */
let syncCache: { config: ServerHaConfig | null; source: ConfigSource | null } | undefined;

export function primeConfigCache(
  value: { config: ServerHaConfig | null; source: ConfigSource | null } | undefined
): void {
  syncCache = value;
  cached = value;
}

export function getServerHaConfig(): ServerHaConfig | null {
  // Routes call loadHaConfig() first; this remains for sync paths.
  if (cached) return cached.config;
  if (syncCache) return syncCache.config;
  // Fallback: env only (file config requires the async loader).
  return readEnvConfig();
}

export function isMockModeConfigured(config: ServerHaConfig | null): boolean {
  if (process.env.NEXT_PUBLIC_USE_MOCK === 'true') return true;
  return config === null;
}

const SERVICE_ALLOWLIST: Record<string, readonly string[]> = {
  light: ['turn_on', 'turn_off', 'toggle'],
  switch: ['turn_on', 'turn_off', 'toggle'],
  lock: ['lock', 'unlock'],
  cover: ['open_cover', 'close_cover', 'stop_cover'],
  climate: ['set_temperature', 'set_hvac_mode'],
  alarm_control_panel: ['alarm_disarm', 'alarm_arm_home', 'alarm_arm_away', 'alarm_arm_night'],
  scene: ['turn_on'],
  script: ['turn_on'],
  todo: ['update_item'],
};

export function isServiceAllowed(domain: string, service: string): boolean {
  const allowed = SERVICE_ALLOWLIST[domain];
  return allowed !== undefined && allowed.includes(service);
}

const DATA_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

/**
 * Service data is passed through to Home Assistant, but only with simple,
 * well-formed keys/values so the proxy cannot be abused to smuggle
 * arbitrary payloads.
 */
export function sanitizeServiceData(
  input: unknown
): Record<string, string | number | boolean | string[]> | undefined {
  if (input === undefined || input === null) return undefined;
  if (typeof input !== 'object' || Array.isArray(input)) return undefined;

  const result: Record<string, string | number | boolean | string[]> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!DATA_KEY_PATTERN.test(key)) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value;
    } else if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
      result[key] = value as string[];
    }
  }
  return result;
}

/** Fetch against Home Assistant with the server-held token. Never log the token. */
export async function haFetch(
  path: string,
  init?: RequestInit,
  configOverride?: ServerHaConfig
): Promise<Response> {
  const config = configOverride ?? (await loadHaConfig()).config;
  if (!config) {
    return new Response(JSON.stringify({ error: 'Home Assistant is not configured.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    return await fetch(`${config.url}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
  } catch {
    // Message intentionally contains no URL/token details.
    return new Response(JSON.stringify({ error: 'Home Assistant is unreachable.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/** Validates a candidate URL/token pair against a live Home Assistant. */
export async function testHaConnection(
  url: string,
  token: string
): Promise<{ ok: boolean; error?: string; location?: string; version?: string }> {
  const normalized = parseHttpUrl(url);
  if (!normalized) return { ok: false, error: 'That doesn\'t look like a valid http(s) URL.' };
  if (token.trim().length < 20) {
    return { ok: false, error: 'The access token looks too short. Paste the full token.' };
  }

  try {
    const response = await fetch(`${normalized}/api/config`, {
      headers: { Authorization: `Bearer ${token.trim()}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 401) {
      return { ok: false, error: 'Home Assistant rejected the token. Check and try again.' };
    }
    if (!response.ok) {
      return { ok: false, error: `Home Assistant responded with status ${response.status}.` };
    }
    const body = (await response.json()) as { location?: string; version?: string };
    return { ok: true, location: body.location, version: body.version };
  } catch {
    return { ok: false, error: 'Could not reach that URL. Is Home Assistant running and reachable?' };
  }
}

/** Atomically persists the in-app configuration. */
export async function saveHaFileConfig(url: string, token: string): Promise<void> {
  const normalized = parseHttpUrl(url);
  if (!normalized) throw new Error('Invalid URL');
  const dir = dataDir();
  await fs.mkdir(dir, { recursive: true });
  const target = configPath();
  const temp = `${target}.tmp`;
  await fs.writeFile(temp, JSON.stringify({ url: normalized, token: token.trim() }, null, 2), {
    mode: 0o600,
  });
  await fs.rename(temp, target);
  invalidateHaConfigCache();
}

/** Removes the in-app configuration (falls back to env vars, if any). */
export async function clearHaFileConfig(): Promise<void> {
  try {
    await fs.unlink(configPath());
  } catch {
    // Already gone.
  }
  invalidateHaConfigCache();
}
