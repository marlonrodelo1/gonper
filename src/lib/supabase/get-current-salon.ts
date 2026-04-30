import { createClient } from '@/lib/supabase/server';

/**
 * Devuelve la fila de `salones` asociada al usuario autenticado.
 *
 * El schema (docs/03-schema.sql) NO tiene `owner_user_id` en `salones`.
 * La relación usuario <-> salón se modela en la tabla intermedia
 * `usuarios_salon` (auth_user_id, salon_id, rol). Aquí buscamos
 * preferentemente el salón donde el user tiene rol "dueno"; si no,
 * cualquier salón al que pertenezca.
 *
 * Retorna null si no hay user o si no hay salón asociado.
 */
export async function getCurrentSalon() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('usuarios_salon')
    .select('rol, salones(*)')
    .eq('auth_user_id', user.id)
    .order('rol', { ascending: true }) // 'admin','dueno','empleado' alfabéticamente; preferimos dueno
    .limit(10);

  if (error || !data || data.length === 0) return null;

  // Priorizar rol 'dueno'; si no, primer registro disponible.
  const preferida =
    data.find((row) => row.rol === 'dueno') ?? data[0];

  // `salones` viene como objeto (relación 1:1 vía FK).
  const salon = (preferida as { salones: unknown }).salones;
  return (salon ?? null) as Record<string, unknown> | null;
}
