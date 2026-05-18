/**
 * Normaliza un número de teléfono a formato E.164 sin signos, listo para
 * concatenar tras `https://wa.me/`.
 *
 * Acepta entradas como "+34 611 222 333", "0034611222333", "611222333",
 * "34611222333". Si no detecta prefijo internacional, asume España (+34).
 *
 * Devuelve sólo dígitos. Si el número resultante es muy corto/largo
 * (fuera del rango E.164: 8-15 dígitos), devuelve null.
 */
export function normalizarNumeroE164(input: string): string | null {
  const limpio = input.replace(/[^\d+]/g, '');
  if (!limpio) return null;

  let digitos: string;
  if (limpio.startsWith('+')) {
    digitos = limpio.slice(1);
  } else if (limpio.startsWith('00')) {
    digitos = limpio.slice(2);
  } else if (limpio.length === 9) {
    // móvil/fijo español sin prefijo → asumir +34
    digitos = `34${limpio}`;
  } else {
    digitos = limpio;
  }

  // Sanity check: entre 8 y 15 dígitos (E.164 max 15)
  if (digitos.length < 8 || digitos.length > 15) return null;
  return digitos;
}

/**
 * Construye una URL `https://wa.me/{numero}?text={mensaje}` lista para
 * abrir en navegador o app de WhatsApp. Si el teléfono no es válido,
 * devuelve null (el caller debe ocultar el botón).
 */
export function buildWhatsAppLink(
  telefono: string | null | undefined,
  mensaje: string,
): string | null {
  if (!telefono) return null;
  const numero = normalizarNumeroE164(telefono);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
