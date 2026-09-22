import { NextResponse } from 'next/server';
import { loadHaConfig, isMockModeConfigured } from '@/lib/homeassistant/server';

export const dynamic = 'force-dynamic';

/**
 * Tells the browser whether to run in demo mode. Deliberately exposes
 * only booleans — never the URL or token.
 */
export async function GET() {
  const { config, source } = await loadHaConfig();
  return NextResponse.json({
    useMock: isMockModeConfigured(config),
    configured: config !== null,
    source,
  });
}
