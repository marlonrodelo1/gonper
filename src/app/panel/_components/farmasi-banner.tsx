import Link from 'next/link';

import { descartarBannerFarmasi } from '@/app/panel/config/farmasi/actions';

type Props = {
  /** Si true (ya activado o ya descartado), no renderiza nada. */
  oculto: boolean;
};

/**
 * Banner promocional para activar la tienda Farmasi. Solo aparece en
 * /panel/hoy si el salón no tiene `farmasi_username` y no ha pulsado
 * "No me interesa" (que guarda config_json.farmasiBannerDismissed=true).
 */
export function FarmasiBanner({ oculto }: Props) {
  if (oculto) return null;

  return (
    <div
      className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-5"
      style={{
        borderColor: 'rgba(197,142,44,0.45)',
        background:
          'linear-gradient(180deg, rgba(197,142,44,0.10) 0%, rgba(197,142,44,0.02) 100%)',
      }}
      role="status"
    >
      <div className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Ingreso extra
        </span>
        <p className="tight text-[15px] font-medium text-ink">
          Activa tu tienda Farmasi y gana 30-50% en cada venta
        </p>
        <p className="text-[12.5px] text-stone">
          Ofrece cosmética premium a tus clientas desde tu propia web. Sin
          gestión de stock ni envíos.
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/panel/config/farmasi"
          className="gloss-btn tight inline-flex items-center justify-center rounded-full px-4 py-2 text-[12.5px] font-medium"
        >
          Conocer más
        </Link>
        <form action={descartarBannerFarmasi}>
          <button
            type="submit"
            className="tight rounded-full border border-line bg-paper px-3 py-2 text-[12.5px] font-medium text-stone transition hover:text-ink"
            title="No mostrar este aviso"
          >
            No me interesa
          </button>
        </form>
      </div>
    </div>
  );
}
