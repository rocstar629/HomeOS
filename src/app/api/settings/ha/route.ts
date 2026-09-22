import { NextResponse } from 'next/server';
import {
  loadHaConfig,
  testHaConnection,
  saveHaFileConfig,
  clearHaFileConfig,
} from '@/lib/homeassistant/server';

export const dynamic = 'force-dynamic';

/**
 * Settings endpoints for Home Assistant credentials.
 *
 * GET    → connection status + configured URL (token is never returned)
 * POST   → validate and save credentials written from the Settings screen
 * DELETE → remove app-stored credentials (reverts to env vars if present)
 */

export async function GET() {
  const { config, source } = await loadHaConfig();
  return NextResponse.json({
    configured: config !== null,
    source,
    // The URL is shown so the household admin can review/edit it.
    // The token is intentionally never included.
    url: config?.url ?? '',
    hasToken: config !== null,
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { url, token, testOnly } = (body ?? {}) as {
    url?: unknown;
    token?: unknown;
    testOnly?: unknown;
  };

  if (typeof url !== 'string' || !url.trim()) {
    return NextResponse.json({ error: 'Please enter your Home Assistant URL.' }, { status: 400 });
  }

  // When saving without re-entering the token, keep the one currently in use.
  let effectiveToken = typeof token === 'string' ? token.trim() : '';
  if (!effectiveToken) {
    const existing = await loadHaConfig();
    if (existing.config) {
      effectiveToken = existing.config.token;
    } else {
      return NextResponse.json(
        { error: 'Please enter your Home Assistant access token.' },
        { status: 400 }
      );
    }
  }

  const test = await testHaConnection(url, effectiveToken);
  if (!test.ok) {
    return NextResponse.json({ error: test.error ?? 'Connection test failed.' }, { status: 400 });
  }

  if (testOnly) {
    return NextResponse.json({ ok: true, location: test.location, version: test.version });
  }

  await saveHaFileConfig(url, effectiveToken);
  return NextResponse.json({
    ok: true,
    location: test.location,
    version: test.version,
    source: 'file',
  });
}

export async function DELETE() {
  await clearHaFileConfig();
  const { config, source } = await loadHaConfig();
  return NextResponse.json({
    ok: true,
    configured: config !== null,
    source,
  });
}
