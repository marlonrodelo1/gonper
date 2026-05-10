import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

/**
 * GET /api/v1/geocode/search?q=<address>
 *
 * Proxy a Nominatim (OpenStreetMap, gratis). Usado por el autocompletado
 * de dirección del panel del dueño en /panel/config/web.
 *
 * Reglas de uso de Nominatim que respetamos:
 *   - User-Agent identificativo (https://operations.osmfoundation.org/policies/nominatim/).
 *   - Rate limit servidor: máx 60 req/día por IP autenticada (autocompletado
 *     con debounce ya genera <10 req por dirección).
 *   - Cache HTTP de 1h en respuestas idénticas para no martillear OSM.
 *
 * Auth: requiere sesión Supabase (sólo dueños lo usan desde el panel).
 *
 * Devuelve hasta 5 sugerencias con `display_name`, `lat`, `lon`, `address`
 * (que incluye city, state, country) y `place_id`.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT =
  'Gestori (https://gestori.es; contacto@gestori.es)';

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    province?: string;
    country?: string;
    country_code?: string;
    postcode?: string;
  };
};

export async function GET(req: Request) {
  // Solo usuarios logueados. No queremos que el endpoint sea consumido
  // por scripts anónimos.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(req);
  const limit = await checkRateLimit('ip', `geocode:${ip}`, 200);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Has alcanzado el límite diario de búsquedas.' },
      { status: 429 },
    );
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  if (q.length < 3) {
    return NextResponse.json({ results: [] });
  }
  if (q.length > 200) {
    return NextResponse.json({ error: 'query_too_long' }, { status: 400 });
  }

  const params = new URLSearchParams({
    q,
    format: 'json',
    addressdetails: '1',
    limit: '5',
    'accept-language': 'es',
    countrycodes: 'es',
  });

  try {
    const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: 'upstream', status: res.status },
        { status: 502 },
      );
    }

    const raw = (await res.json()) as NominatimResult[];
    const results = raw.map((r) => {
      const a = r.address ?? {};
      const ciudad =
        a.city ?? a.town ?? a.village ?? a.municipality ?? null;
      const provincia = a.province ?? a.state ?? a.county ?? null;
      const calleSimple = [a.road, a.house_number].filter(Boolean).join(' ');
      const direccionCorta = [
        calleSimple || null,
        ciudad,
        provincia,
      ]
        .filter(Boolean)
        .join(', ');

      return {
        place_id: r.place_id,
        display_name: r.display_name,
        direccion_corta: direccionCorta || r.display_name,
        lat: Number(r.lat),
        lng: Number(r.lon),
        ciudad,
        provincia,
        codigo_postal: a.postcode ?? null,
        pais: a.country ?? null,
      };
    });

    const response = NextResponse.json({ results });
    response.headers.set(
      'Cache-Control',
      'private, s-maxage=3600, stale-while-revalidate=86400',
    );
    return response;
  } catch (e) {
    console.error('[geocode/search]', e);
    return NextResponse.json({ error: 'network' }, { status: 502 });
  }
}

export const dynamic = 'force-dynamic';
