import { redirect } from 'next/navigation';

/**
 * `/farmasi` (URL corta para redes/papelería) redirige a la tienda
 * embebida `/tienda`, que carga farmasi.es/gonperstudio en iframe sin
 * que el cliente salga de gonperstudio.shop.
 */
export default function FarmasiRedirect(): never {
  redirect('/tienda');
}
