import { NextResponse } from 'next/server';
import { haFetch, isServiceAllowed, sanitizeServiceData } from '@/lib/homeassistant/server';

export const dynamic = 'force-dynamic';

const DOMAIN_PATTERN = /^[a-z][a-z0-9_]*$/;
const SERVICE_PATTERN = /^[a-z][a-z0-9_]*$/;
const ENTITY_ID_PATTERN = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { domain, service, data } = (body ?? {}) as {
    domain?: unknown;
    service?: unknown;
    data?: unknown;
  };

  if (
    typeof domain !== 'string' || !DOMAIN_PATTERN.test(domain) ||
    typeof service !== 'string' || !SERVICE_PATTERN.test(service)
  ) {
    return NextResponse.json({ error: 'Invalid domain or service.' }, { status: 400 });
  }

  if (!isServiceAllowed(domain, service)) {
    return NextResponse.json({ error: 'Service is not permitted.' }, { status: 403 });
  }

  const sanitized = sanitizeServiceData(data);

  // entity_id must look like a real entity id when present.
  if (sanitized && sanitized.entity_id !== undefined) {
    const entityId = sanitized.entity_id;
    const valid =
      (typeof entityId === 'string' && ENTITY_ID_PATTERN.test(entityId)) ||
      (Array.isArray(entityId) && entityId.every((id) => ENTITY_ID_PATTERN.test(id)));
    if (!valid) {
      return NextResponse.json({ error: 'Invalid entity_id.' }, { status: 400 });
    }
  }

  const response = await haFetch(`/api/services/${domain}/${service}`, {
    method: 'POST',
    body: JSON.stringify(sanitized ?? {}),
  });

  if (!response.ok) {
    const status = response.status === 503 ? 503 : 502;
    const detail = await response.json().catch(() => ({}));
    return NextResponse.json(
      { error: typeof detail.error === 'string' ? detail.error : 'Home Assistant rejected the service call.' },
      { status }
    );
  }

  return NextResponse.json({ ok: true });
}
