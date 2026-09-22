import { NextResponse } from 'next/server';
import { haFetch } from '@/lib/homeassistant/server';

export const dynamic = 'force-dynamic';

/**
 * Aggregates upcoming events from every HA calendar entity into one
 * response, so the UI does not need to know about per-calendar endpoints.
 */
export async function GET() {
  const statesResponse = await haFetch('/api/states');
  if (!statesResponse.ok) {
    const status = statesResponse.status === 503 ? 503 : 502;
    const body = await statesResponse.json().catch(() => ({}));
    return NextResponse.json({ error: body.error ?? 'Upstream request failed.' }, { status });
  }

  const states = (await statesResponse.json()) as Array<{ entity_id: string }>;
  const calendarIds = states
    .filter((s) => s.entity_id.startsWith('calendar.'))
    .map((s) => s.entity_id);

  const start = new Date();
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  const results = await Promise.all(
    calendarIds.map(async (entityId) => {
      const response = await haFetch(
        `/api/calendars/${entityId}?start=${start.toISOString()}&end=${end.toISOString()}`
      );
      if (!response.ok) return [];
      const events = await response.json().catch(() => []);
      return Array.isArray(events) ? events : [];
    })
  );

  type RawEvent = Record<string, unknown>;
  const flattened = results.flat() as RawEvent[];

  const events = flattened
    .map((event, index) => {
      const startValue = event.start as { dateTime?: string; date?: string } | string | undefined;
      const endValue = event.end as { dateTime?: string; date?: string } | string | undefined;
      const start =
        typeof startValue === 'string' ? startValue : startValue?.dateTime ?? startValue?.date;
      const end = typeof endValue === 'string' ? endValue : endValue?.dateTime ?? endValue?.date;
      if (!start) return null;
      return {
        id: String(event.uid ?? `${index}-${start}`),
        summary: String(event.summary ?? 'Untitled event'),
        start,
        end: end ?? start,
        description: typeof event.description === 'string' ? event.description : undefined,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 50);

  return NextResponse.json({ events });
}
