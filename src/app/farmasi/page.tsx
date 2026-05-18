import { redirect } from 'next/navigation';

/**
 * `/farmasi` redirige al server-side a la tienda BI de Gonper Studio en
 * Farmasi.es. Mantiene la URL corta `gonperstudio.shop/farmasi` para
 * compartir en redes, pero no renderiza landing intermedia.
 */
export default function FarmasiRedirect(): never {
  redirect('https://www.farmasi.es/gonperstudio');
}
