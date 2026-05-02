import { NextResponse } from 'next/server';

import { track } from '@/lib/observability/posthog';

interface TrackBody {
  event?: string;
  properties?: Record<string, unknown>;
  distinctId?: string;
}

/**
 * POST /api/_track — endpoint público (sin auth) para que el cliente
 * dispare eventos a PostHog vía nuestro server-side wrapper. Pensado
 * principalmente para `$pageview` desde `<PosthogPageview/>`.
 */
export async function POST(request: Request) {
  let body: TrackBody;
  try {
    body = (await request.json()) as TrackBody;
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const event = typeof body.event === 'string' ? body.event : '';
  if (!event) return new NextResponse(null, { status: 204 });

  await track(event, body.properties, body.distinctId);
  return new NextResponse(null, { status: 204 });
}
