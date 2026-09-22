import { HAEntity } from './types';

/**
 * Client-side Home Assistant access.
 *
 * Security: this client never holds an access token and never talks to
 * Home Assistant directly. All requests go to same-origin Next.js API
 * routes (/api/ha/*), which hold HOME_ASSISTANT_URL/TOKEN on the server.
 * This keeps credentials out of the browser bundle entirely.
 */
export interface HAConfig {
  /** True when no HA credentials are configured; UI uses demo data. */
  useMock: boolean;
  /** True when HOME_ASSISTANT_URL and TOKEN are both set. */
  configured: boolean;
  /** Where the credentials came from: in-app Settings file or env vars. */
  source?: 'file' | 'env' | null;
}

const DOMAINS_WITH_ENTITIES = [
  'person',
  'zone',
  'light',
  'switch',
  'lock',
  'cover',
  'climate',
  'camera',
  'binary_sensor',
  'sensor',
  'alarm_control_panel',
  'weather',
  'calendar',
  'todo',
];

export class HomeAssistantClient {
  constructor(private readonly config: HAConfig) {}

  /**
   * Fetch all relevant entity states. HA's /api/states has no server-side
   * filter, so we filter by the domains FamilyOS understands.
   */
  async getEntities(): Promise<HAEntity[]> {
    const response = await fetch('/api/ha/states', { cache: 'no-store' });

    if (!response.ok) {
      const detail = response.status === 503
        ? 'Home Assistant is not configured or unreachable.'
        : `Home Assistant request failed (${response.status}).`;
      throw new Error(detail);
    }

    const states: HAEntity[] = await response.json();
    return states.filter((entity) => {
      const dot = entity.entity_id.indexOf('.');
      const domain = dot === -1 ? '' : entity.entity_id.slice(0, dot);
      return DOMAINS_WITH_ENTITIES.includes(domain);
    });
  }

  /**
   * Call a Home Assistant service. The server validates domain/service
   * against an allowlist before forwarding.
   */
  async callService(domain: string, service: string, data?: Record<string, unknown>): Promise<void> {
    if (this.config.useMock) return;

    const response = await fetch('/api/ha/service', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, service, data }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        typeof body.error === 'string' ? body.error : `Service call failed (${response.status}).`
      );
    }
  }

  get isMock(): boolean {
    return this.config.useMock;
  }
}
