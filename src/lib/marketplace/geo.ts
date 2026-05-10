/**
 * Utilidades de geolocalización para el marketplace.
 *
 * Usa fórmula haversine (esfera) — exactitud ±0.5% para distancias <500km,
 * más que suficiente para "salones a 20 km a la redonda".
 *
 * Client-safe: no toca BBDD, todo cálculo puro en JS.
 */

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Distancia haversine en km entre dos coordenadas.
 */
export function distanciaKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return EARTH_RADIUS_KM * c;
}

/** Radio por defecto para el filtro "cerca de mí" (km). */
export const DEFAULT_RADIO_KM = 20;
