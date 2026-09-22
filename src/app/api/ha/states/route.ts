import { NextResponse } from 'next/server';
import { haFetch } from '@/lib/homeassistant/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const response = await haFetch('/api/states');

  if (!response.ok) {
    const status = response.status === 503 ? 503 : 502;
    const body = await response.json().catch(() => ({}));
    return NextResponse.json({ error: body.error ?? 'Upstream request failed.' }, { status });
  }

  const states = await response.json();
  if (!Array.isArray(states)) {
    return NextResponse.json({ error: 'Unexpected response from Home Assistant.' }, { status: 502 });
  }

  return NextResponse.json(states);
}
