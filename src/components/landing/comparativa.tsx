import { Fragment } from "react";
import { Icon } from "@/components/landing/icons";

type CellValue = boolean | "~";
type Row = [string, CellValue, CellValue, CellValue];

const rows: Row[] = [
  ["Reservas por chat (Telegram / WhatsApp)", true, false, false],
  ["Sin app que descargar", true, false, false],
  ["Personaje configurable (nombre, tono)", true, false, false],
  ["Confirmación 1h antes con liberación auto", true, "~", "~"],
  ["Cuota fija sin comisión por reserva", true, false, false],
  ["Soporte y facturación en España", true, "~", false],
  ["Asistente IA para el dueño", true, false, false],
];

function cell(v: CellValue) {
  if (v === true) {
    return <Icon.Check width="16" height="16" className="text-sage mx-auto" />;
  }
  if (v === false) {
    return <span className="block text-stone/30 text-center">—</span>;
  }
  return (
    <span className="block text-stone/60 text-center text-[12px]">parcial</span>
  );
}

export function Comparativa() {
  return (
    <section className="py-32 px-6">
      <div className="mx-auto max-w-[1100px]">
        <div className="reveal text-center mb-12">
          <div className="text-[12px] uppercase tracking-[0.22em] text-stone/80 mb-4">
            Por qué Gonper
          </div>
          <h2
            className="tight font-medium text-ink"
            style={{ fontSize: "clamp(36px, 5vw, 56px)", lineHeight: 1 }}
          >
            Lo que <span className="font-serif-it">Fresha y Booksy</span>
            <br />
            no te van a dar.
          </h2>
        </div>
        <div className="reveal rounded-3xl border border-line bg-paper overflow-hidden">
          <div className="grid grid-cols-[1.8fr_1fr_1fr_1fr] text-[13px]">
            <div className="px-6 py-5 text-stone uppercase tracking-[0.18em] text-[11px] border-b border-line">
              Característica
            </div>
            <div className="px-4 py-5 text-center bg-ink text-cream tight font-medium border-b border-line">
              Gonper
            </div>
            <div className="px-4 py-5 text-center text-stone uppercase tracking-[0.18em] text-[11px] border-b border-line">
              Fresha
            </div>
            <div className="px-4 py-5 text-center text-stone uppercase tracking-[0.18em] text-[11px] border-b border-line">
              Booksy
            </div>
            {rows.map(([label, v1, v2, v3], i) => {
              const isLast = i === rows.length - 1;
              return (
                <Fragment key={i}>
                  <div
                    className={`px-6 py-4 text-ink ${
                      !isLast ? "border-b border-line" : ""
                    }`}
                  >
                    {label}
                  </div>
                  <div
                    className={`px-4 py-4 bg-ink/95 ${
                      !isLast ? "border-b border-ink/80" : ""
                    }`}
                  >
                    {cell(v1)}
                  </div>
                  <div
                    className={`px-4 py-4 ${
                      !isLast ? "border-b border-line" : ""
                    }`}
                  >
                    {cell(v2)}
                  </div>
                  <div
                    className={`px-4 py-4 ${
                      !isLast ? "border-b border-line" : ""
                    }`}
                  >
                    {cell(v3)}
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
