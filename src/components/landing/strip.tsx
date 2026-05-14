export function Strip() {
  const items = [
    "Tu negocio desde el móvil",
    "Avisos en tiempo real",
    "Tus clientes reservan solos",
    "Recordatorios automáticos",
    "Link y QR para compartir",
    "Asistente IA en español",
    "30€/mes sin comisiones",
    "7 días gratis sin tarjeta",
  ];
  const row = [...items, ...items];
  return (
    <section className="border-y border-line bg-paper py-4 overflow-hidden">
      <div className="flex gap-12 whitespace-nowrap marquee-track">
        {row.map((s, i) => (
          <span
            key={i}
            className="text-[13px] text-stone tight uppercase tracking-[0.18em] flex items-center gap-12"
          >
            {s}
            <span className="text-terracotta">✻</span>
          </span>
        ))}
      </div>
    </section>
  );
}
