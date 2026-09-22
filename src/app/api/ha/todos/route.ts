import { NextResponse } from 'next/server';
import { haFetch } from '@/lib/homeassistant/server';

export const dynamic = 'force-dynamic';

/**
 * Aggregates items from every HA to-do list entity into one response.
 */
export async function GET() {
  const statesResponse = await haFetch('/api/states');
  if (!statesResponse.ok) {
    const status = statesResponse.status === 503 ? 503 : 502;
    const body = await statesResponse.json().catch(() => ({}));
    return NextResponse.json({ error: body.error ?? 'Upstream request failed.' }, { status });
  }

  const states = (await statesResponse.json()) as Array<{ entity_id: string }>;
  const todoIds = states.filter((s) => s.entity_id.startsWith('todo.')).map((s) => s.entity_id);

  const results = await Promise.all(
    todoIds.map(async (entityId) => {
      const response = await haFetch(`/api/todo_items/${entityId}`);
      if (!response.ok) return [];
      const body = await response.json().catch(() => ({}));
      const items = (body as { items?: unknown }).items;
      return Array.isArray(items)
        ? (items as Record<string, unknown>[]).map((item) => ({ item, listEntityId: entityId }))
        : [];
    })
  );

  const tasks = results.flat().map(({ item, listEntityId }, index) => ({
    id: String(item.uid ?? `${listEntityId}-${index}`),
    title: String(item.summary ?? 'Untitled task'),
    description: typeof item.description === 'string' ? item.description : undefined,
    completed: item.status === 'completed',
    dueDate: typeof item.due === 'string' ? item.due : undefined,
    listEntityId,
    itemUid: typeof item.uid === 'string' ? item.uid : undefined,
  }));

  return NextResponse.json({ tasks });
}
