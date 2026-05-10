'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Autocompletado de dirección con OpenStreetMap (Nominatim) vía nuestro proxy
 * `/api/v1/geocode/search`. Al elegir una sugerencia, rellena hidden inputs
 * con `direccion`, `direccion_formateada`, `lat`, `lng`, `ciudad`,
 * `provincia` y `osm_place_id` para que el form padre los envíe al server
 * action.
 *
 * Pensado para `/panel/config/web` cuando el dueño edita los datos del
 * marketplace. Si el dueño no usa el autocomplete, los hidden inputs llevan
 * los valores actuales del salón (de los defaults), así no rompemos el form.
 */

type Sugerencia = {
  place_id: number;
  display_name: string;
  direccion_corta: string;
  lat: number;
  lng: number;
  ciudad: string | null;
  provincia: string | null;
  codigo_postal: string | null;
  pais: string | null;
};

type Props = {
  defaultDireccion: string;
  defaultDireccionFormateada: string;
  defaultLat: string | null;
  defaultLng: string | null;
  defaultCiudad: string;
  defaultProvincia: string;
  defaultOsmPlaceId: string;
  /** Etiqueta que aparece arriba del input. */
  label?: string;
};

const DEBOUNCE_MS = 350;
const MIN_CHARS = 3;

export function AddressAutocomplete({
  defaultDireccion,
  defaultDireccionFormateada,
  defaultLat,
  defaultLng,
  defaultCiudad,
  defaultProvincia,
  defaultOsmPlaceId,
  label = 'Dirección',
}: Props) {
  const [query, setQuery] = useState(defaultDireccion);
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seleccion, setSeleccion] = useState<{
    direccion: string;
    direccionFormateada: string;
    lat: string;
    lng: string;
    ciudad: string;
    provincia: string;
    osmPlaceId: string;
  }>({
    direccion: defaultDireccion,
    direccionFormateada: defaultDireccionFormateada,
    lat: defaultLat ?? '',
    lng: defaultLng ?? '',
    ciudad: defaultCiudad,
    provincia: defaultProvincia,
    osmPlaceId: defaultOsmPlaceId,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Debounced fetch a /api/v1/geocode/search
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_CHARS) {
      setSugerencias([]);
      setLoading(false);
      return;
    }
    // Si la query coincide exactamente con la dirección ya seleccionada,
    // no buscamos otra vez.
    if (q === seleccion.direccion && sugerencias.length === 0) return;

    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/v1/geocode/search?q=${encodeURIComponent(q)}`,
          { signal: ctrl.signal, cache: 'no-store' },
        );
        if (!res.ok) {
          setSugerencias([]);
          return;
        }
        const data = (await res.json()) as { results?: Sugerencia[] };
        setSugerencias(Array.isArray(data.results) ? data.results : []);
        if (Array.isArray(data.results) && data.results.length > 0) {
          setOpen(true);
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setSugerencias([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function elegir(s: Sugerencia) {
    setSeleccion({
      direccion: s.direccion_corta,
      direccionFormateada: s.display_name,
      lat: String(s.lat),
      lng: String(s.lng),
      ciudad: s.ciudad ?? '',
      provincia: s.provincia ?? '',
      osmPlaceId: String(s.place_id),
    });
    setQuery(s.direccion_corta);
    setOpen(false);
  }

  function onInputChange(value: string) {
    setQuery(value);
    // Si el usuario edita el texto, dejamos los hidden inputs como están
    // (con la última selección válida) para que el form siga teniendo
    // datos coherentes hasta que elija una nueva sugerencia.
    setSeleccion((prev) => ({ ...prev, direccion: value }));
  }

  return (
    <div className="relative" ref={containerRef}>
      <label
        htmlFor="address-autocomplete-input"
        className="text-[11px] uppercase tracking-[0.2em] text-stone/80"
      >
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id="address-autocomplete-input"
          type="text"
          value={query}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={() => sugerencias.length > 0 && setOpen(true)}
          autoComplete="off"
          placeholder="Empieza a escribir tu dirección…"
          className="w-full rounded-2xl border border-line bg-paper px-4 py-3 pr-10 text-[13.5px] text-ink placeholder:text-stone/55 focus:outline-none focus:border-line-2"
        />
        {loading && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-stone/30 border-t-stone"
            aria-hidden
          />
        )}
      </div>

      {open && sugerencias.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-[260px] overflow-y-auto rounded-2xl border border-line bg-paper py-1.5 shadow-2xl"
        >
          {sugerencias.map((s) => (
            <li key={s.place_id}>
              <button
                type="button"
                onClick={() => elegir(s)}
                className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left hover:bg-cream"
              >
                <span className="text-[13.5px] tight text-ink">
                  {s.direccion_corta}
                </span>
                <span className="text-[11.5px] text-stone/75 line-clamp-1">
                  {s.display_name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-1.5 text-[11.5px] text-stone/70">
        Buscamos vía OpenStreetMap. Elige una sugerencia para guardar la
        ubicación exacta.
      </p>

      {/* Hidden inputs que envía el form padre */}
      <input type="hidden" name="direccion" value={seleccion.direccion} />
      <input
        type="hidden"
        name="direccion_formateada"
        value={seleccion.direccionFormateada}
      />
      <input type="hidden" name="lat" value={seleccion.lat} />
      <input type="hidden" name="lng" value={seleccion.lng} />
      <input type="hidden" name="ciudad" value={seleccion.ciudad} />
      <input type="hidden" name="provincia" value={seleccion.provincia} />
      <input
        type="hidden"
        name="osm_place_id"
        value={seleccion.osmPlaceId}
      />
    </div>
  );
}
