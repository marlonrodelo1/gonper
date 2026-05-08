import Link from 'next/link';

type Props = {
  diasRestantes: number;
};

/**
 * Banner no bloqueante que recuerda al dueño que faltan pocos días para
 * añadir tarjeta. Aparece sólo si quedan 7 días o menos. A 1-2 días pasa
 * a tono rojo más insistente. Cuando el trial vence (días <= 0), no se
 * muestra este banner — entra TrialBlocker en su lugar.
 */
export function TrialBanner({ diasRestantes }: Props) {
  if (diasRestantes <= 0 || diasRestantes > 7) return null;

  const urgente = diasRestantes <= 2;
  const dias = diasRestantes;
  const plural = dias === 1 ? 'día' : 'días';

  return (
    <div
      className={`flex items-center gap-3 border-b px-4 py-2.5 text-[13px] md:px-8 ${
        urgente
          ? 'border-[#7C2E2E]/20 bg-[#F1D6D6] text-[#7C2E2E]'
          : 'border-amber-200 bg-amber-50 text-amber-900'
      }`}
      role="status"
    >
      <span
        className={`inline-block h-2 w-2 shrink-0 rounded-full ${
          urgente ? 'bg-[#B14848]' : 'bg-amber-500'
        }`}
        aria-hidden
      />
      <div className="flex-1 leading-tight">
        <strong className="font-medium">
          {urgente ? 'Tu prueba acaba pronto: ' : 'Tu prueba gratuita: '}
        </strong>
        {urgente
          ? `solo te quedan ${dias} ${plural} para añadir tu tarjeta antes de que la cuenta se bloquee.`
          : `te quedan ${dias} ${plural}. Añade tu tarjeta cuando quieras y sigue sin interrupciones.`}
      </div>
      <Link
        href="/panel/config/suscripcion"
        className={`tight shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition ${
          urgente
            ? 'bg-[#7C2E2E] text-white hover:bg-[#6A2424]'
            : 'bg-amber-900 text-amber-50 hover:bg-amber-950'
        }`}
      >
        Activar ahora
      </Link>
    </div>
  );
}
