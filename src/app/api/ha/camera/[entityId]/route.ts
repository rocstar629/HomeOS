import { NextResponse } from 'next/server';
import { haFetch } from '@/lib/homeassistant/server';

export const dynamic = 'force-dynamic';

const ENTITY_ID_PATTERN = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;

/**
 * Proxies a camera snapshot from Home Assistant so the browser never
 * needs credentials. Returns the raw image bytes from /api/camera_proxy.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { entityId } = await params;

  if (!entityId.startsWith('camera.') || !ENTITY_ID_PATTERN.test(entityId)) {
    return NextResponse.json({ error: 'Invalid camera entity.' }, { status: 400 });
  }

  const response = await haFetch(`/api/camera_proxy/${entityId}`);

  if (!response.ok) {
    const status = response.status === 503 ? 503 : 502;
    return NextResponse.json({ error: 'Camera snapshot unavailable.' }, { status });
  }

  const contentType = response.headers.get('content-type') ?? 'image/jpeg';
  const bytes = await response.arrayBuffer();

  return new NextResponse(bytes, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=2',
    },
  });
}
