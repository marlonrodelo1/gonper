'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Autocompletado de dirección con OpenStreetMap (Nominatim) vía nuestro proxy
 * `/api/v1/geocode/search`. Al elegir una sugerencia, rellena hidden inputs
 * con `direccion`, `direccion_formateada`, `lat`, `lng`, `ciudad`,
 * `provincia` y `osm_place_id` para que el form padre los envíe al server
 * action.
 *
 * Reglas de coords:
 *   - Si el dueño edita el texto y se separa de la última sugerencia
 *     elegida, las coords se LIMPIAN (no queremos guardar lat/lng obsoletas
 *     apuntando a una dirección anterior).
 *   - Si la página carga con dirección guardada SIN coords (texto antiguo
 *     pre-OSM), buscamos sugerencias automáticamente al montar para que el
 *     dueño las vea sin tener que reescribir.
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
  /** Texto exacto de la última sugerencia elegida — sirve para detectar
   *  ediciones manuales que invalidan las coords. */
  const ultimaElegida = useRef<string | null>(
    defaultLat && defaultLng ? defaultDireccion : null,
  );
  /** Marca para saltarse la próxima búsqueda automática (justo tras elegir). */
  const skipNextFetch = useRef(false);

  const [seleccion, setSeleccion] = useState({
    direccion: defaultDireccion,
    direccionFormateada: defaultDireccionFormateada,
    lat: defaultLat ?? '',
    lng: defaultLng ?? '',
    ciudad: defaultCiudad,
    provincia: defaultProvincia,
    osmPlaceId: defaultOsmPlaceId,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Cerrar dropdown al click fuera
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Auto-buscar al montar si hay texto guardado SIN coords (texto antiguo
  // pre-OSM): así el dueño ve sugerencias sin tener que reescribir.
  useEffect(() => {
    if (defaultDireccion.trim().length >= MIN_CHARS && !defaultLat && !defaultLng) {
      // No marcamos skipNextFetch — queremos que el efecto de [query] dispare
      // la búsqueda. Como query ya = defaultDireccion al montar, el efecto
      // siguiente correrá con normalidad.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced fetch a /api/v1/geocode/search
  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    const q = query.trim();
    if (q.length < MIN_CHARS) {
      setSugerencias([]);
      setLoading(false);
      return;
    }

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
        const list = Array.isArray(data.results) ? data.results : [];
        setSugerencias(list);
        if (list.length > 0) setOpen(true);
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
  }, [query]);

  function elegir(s: Sugerencia) {
    skipNextFetch.current = true;
    ultimaElegida.current = s.direccion_corta;
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
    // Si el texto se separa de la última sugerencia elegida, las coords
    // dejan de ser válidas — las limpiamos para no guardar valores obsoletos.
    const trimmed = value.trim();
    if (ultimaElegida.current && trimmed !== ultimaElegida.current) {
      ultimaElegida.current = null;
      setSeleccion({
        direccion: value,
        direccionFormateada: '',
        lat: '',
        lng: '',
        ciudad: '',
        provincia: '',
        osmPlaceId: '',
      });
    } else {
      setSeleccion((prev) => ({ ...prev, direccion: value }));
    }
  }

  const tieneCoords = !!seleccion.lat && !!seleccion.lng;

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

      {/* Mensaje contextual debajo del input según estado */}
      <p className="mt-1.5 text-[11.5px] text-stone/70">
        {tieneCoords ? (
          <>
            Buscamos vía OpenStreetMap.{' '}
            <span style={{ color: '#5A6B4D' }}>Ubicación exacta guardada.</span>
          </>
        ) : query.trim().length >= MIN_CHARS && sugerencias.length === 0 && !loading ? (
          <>
            No hay sugerencias para esto. Prueba con calle + número + ciudad
            (ej. &ldquo;Carretera General 36, La Victoria&rdquo;).
          </>
        ) : query.trim().length >= MIN_CHARS && sugerencias.length > 0 ? (
          <>Elige una sugerencia para guardar la ubicación exacta.</>
        ) : (
          <>
            Escribe tu dirección. Te sugerimos coincidencias para guardar la
            ubicación exacta.
          </>
        )}
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
