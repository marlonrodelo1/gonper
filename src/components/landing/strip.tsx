export function Strip() {
  const items = [
    "Reservas 24/7",
    "Sin app que descargar",
    "Confirmación 1h antes",
    "Liberación automática del hueco",
    "Lista de espera",
    "Personaje configurable",
    "Cuota fija sin comisiones",
    "Hecho en España",
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
