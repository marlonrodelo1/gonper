'use client';

import { useEffect, useMemo, useState } from 'react';

import { SalonCard } from './salon-card';
import { MarketplaceEmptyState } from './empty-state';
import { Icon } from './icons';
import type { SalonCard as SalonCardData } from '@/lib/marketplace/categorias';
import { DEFAULT_RADIO_KM, distanciaKm } from '@/lib/marketplace/geo';

type GeoState =
  | { phase: 'idle' }
  | { phase: 'requesting' }
  | { phase: 'granted'; lat: number; lng: number }
  | { phase: 'denied' }
  | { phase: 'unavailable' };

type Props = {
  salones: SalonCardData[];
  /** Radio por defecto en km cuando hay geolocalización del usuario. */
  radioKmDefault?: number;
  /** Si hay alguno de los filtros explícitos del marketplace activo, no
   *  aplicamos filtro por distancia (priorizamos lo que el usuario eligió). */
  hasExplicitFilters: boolean;
};

/**
 * Grid client component del marketplace.
 *
 * Al montar intenta `navigator.geolocation.getCurrentPosition`. Si el
 * usuario concede, ordena las cards por distancia y aplica un radio de
 * 20 km por defecto (ajustable con un control). Si rechaza o no hay
 * soporte, muestra el listado original (orden alfabético del server).
 *
 * Cuando hay filtros explícitos (categoría/ciudad/q) no aplica filtro
 * por distancia para no esconder resultados que el usuario pidió;
 * sí ordena por distancia si tiene la geolocalización.
 */
export function MarketplaceGrid({
  salones,
  radioKmDefault = DEFAULT_RADIO_KM,
  hasExplicitFilters,
}: Props) {
  const [geo, setGeo] = useState<GeoState>({ phase: 'idle' });
  const [radioKm, setRadioKm] = useState<number>(radioKmDefault);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('geolocation' in navigator)) {
      setGeo({ phase: 'unavailable' });
      return;
    }

    setGeo({ phase: 'requesting' });
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setGeo({
          phase: 'granted',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => setGeo({ phase: 'denied' }),
      { enableHighAccuracy: false, maximumAge: 5 * 60_000, timeout: 10_000 },
    );
  }, []);

  const enriched = useMemo(() => {
    if (geo.phase !== 'granted') {
      return salones.map((s) => ({ s, dist: null as number | null }));
    }
    const user = { lat: geo.lat, lng: geo.lng };
    return salones.map((s) => {
      if (s.lat === null || s.lng === null) {
        return { s, dist: null as number | null };
      }
      return { s, dist: distanciaKm(user, { lat: s.lat, lng: s.lng }) };
    });
  }, [geo, salones]);

  const ordered = useMemo(() => {
    if (geo.phase !== 'granted') return enriched;
    // Salones con distancia primero (asc), luego los sin coordenadas al final.
    return [...enriched].sort((a, b) => {
      if (a.dist === null && b.dist === null) return 0;
      if (a.dist === null) return 1;
      if (b.dist === null) return -1;
      return a.dist - b.dist;
    });
  }, [enriched, geo.phase]);

  const filtered = useMemo(() => {
    if (geo.phase !== 'granted' || hasExplicitFilters) return ordered;
    // Aplicamos radio sólo cuando no hay filtros explícitos: queremos
    // mostrar lo que el usuario buscó aunque esté lejos.
    return ordered.filter((x) => x.dist === null || x.dist <= radioKm);
  }, [ordered, geo.phase, hasExplicitFilters, radioKm]);

  return (
    <>
      <GeoStatusBar
        geo={geo}
        radioKm={radioKm}
        setRadioKm={setRadioKm}
        suppressed={hasExplicitFilters}
        retry={() => {
          if (!('geolocation' in navigator)) return;
          setGeo({ phase: 'requesting' });
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              setGeo({
                phase: 'granted',
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              }),
            () => setGeo({ phase: 'denied' }),
            {
              enableHighAccuracy: false,
              maximumAge: 5 * 60_000,
              timeout: 10_000,
            },
          );
        }}
      />

      {filtered.length === 0 ? (
        <MarketplaceEmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filtered.map(({ s, dist }, i) => (
            <div
              key={s.slug}
              className="reveal"
              data-delay={Math.min(i * 30, 240)}
            >
              <SalonCard s={s} distanciaKm={dist} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function GeoStatusBar({
  geo,
  radioKm,
  setRadioKm,
  suppressed,
  retry,
}: {
  geo: GeoState;
  radioKm: number;
  setRadioKm: (km: number) => void;
  suppressed: boolean;
  retry: () => void;
}) {
  if (geo.phase === 'idle') return null;

  if (geo.phase === 'requesting') {
    return (
      <div className="reveal in mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-paper border border-line text-[12.5px] tight text-stone">
        <span
          className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-stone/30 border-t-stone"
          aria-hidden
        />
        Buscando salones cerca de ti…
      </div>
    );
  }

  if (geo.phase === 'granted') {
    return (
      <div className="reveal in mb-4 flex flex-wrap items-center gap-2 px-4 py-2 rounded-full bg-paper border border-line text-[12.5px] tight text-stone">
        <span className="inline-flex items-center gap-1.5 text-ink">
          <Icon.Pin width="12" height="12" style={{ color: 'var(--terracotta)' }} />
          <span className="font-medium">Cerca de ti</span>
        </span>
        {!suppressed ? (
          <>
            <span className="text-stone/60">·</span>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <span className="text-stone/70">Radio:</span>
              <select
                value={radioKm}
                onChange={(e) => setRadioKm(Number(e.target.value))}
                className="bg-transparent text-ink focus:outline-none cursor-pointer"
              >
                {[5, 10, 15, 20, 30, 50].map((km) => (
                  <option key={km} value={km}>
                    {km} km
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <span className="text-stone/70">
            · ordenado por cercanía (filtros activos sin radio)
          </span>
        )}
      </div>
    );
  }

  if (geo.phase === 'denied') {
    return (
      <div className="reveal in mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cream border border-line text-[12.5px] tight text-stone">
        <Icon.Pin width="12" height="12" className="text-stone/70" />
        <span>Sin permiso de ubicación.</span>
        <button
          type="button"
          onClick={retry}
          className="text-terracotta hover:text-terracotta-2 underline underline-offset-4 decoration-terracotta/40"
        >
          Activar
        </button>
      </div>
    );
  }

  // unavailable
  return null;
}
