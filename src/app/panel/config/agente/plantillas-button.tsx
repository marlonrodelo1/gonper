'use client';

import { useState } from 'react';

type Plantilla = {
  id: string;
  label: string;
  bienvenida: string;
  instrucciones: string;
};

const PLANTILLAS_POR_TIPO: Record<string, Plantilla[]> = {
  barberia: [
    {
      id: 'barberia-clasica',
      label: 'Barbería clásica',
      bienvenida:
        '¡Buenas! Soy {agente}, asistente de {salon}. ¿En qué te ayudo? Puedes preguntarme por servicios, precios, horario o reservar tu cita.',
      instrucciones: `Eres {agente}, asistente virtual de {salon}, una barbería.
— Habla SIEMPRE en español, frases cortas y directas. Tutea al cliente.
— Si te preguntan por precios o duración, responde con los datos del catálogo.
— Si quieren reservar, comparte el enlace de reservas y di que ahí eligen servicio y hora.
— Si preguntan por algo que no sabes (productos, peticiones especiales), ofrece llamar al teléfono del salón.
— Si están dudando entre cortes, recomienda los más populares.
— No prometas resultados específicos ni ofertas que no estén anunciadas.`,
    },
    {
      id: 'barberia-moderna',
      label: 'Barbería moderna / urbana',
      bienvenida:
        '¡Hey! 👋 Soy {agente}, de {salon}. Cuéntame qué necesitas y te ayudo.',
      instrucciones: `Eres {agente}, asistente de {salon}.
— Tono cercano y desenfadado, en español. Tutea siempre.
— Resalta servicios de tendencia (degradados, diseños, color).
— Comparte el enlace de reservas para que el cliente elija servicio + barbero + hora.
— Si tenemos promo activa, mencionala una vez por conversación.
— Frases cortas, máximo 3 líneas.`,
    },
  ],
  peluqueria: [
    {
      id: 'peluqueria-clasica',
      label: 'Peluquería tradicional',
      bienvenida:
        '¡Hola! Soy {agente}, asistente de {salon}. ¿En qué te ayudo?',
      instrucciones: `Eres {agente}, asistente de {salon}, una peluquería.
— Habla en español, cercana y profesional.
— Si preguntan por color, mecha o tratamiento, responde con duración y precio del catálogo.
— Si quieren reservar, comparte el enlace.
— Pregunta el largo del pelo si dudan entre servicios (corto/medio/largo afecta al precio).
— Recomienda traer pelo limpio y seco para color.`,
    },
    {
      id: 'peluqueria-mujer',
      label: 'Peluquería mujer / estética',
      bienvenida:
        '¡Hola! Soy {agente}, encantada de atenderte en {salon}. ¿Qué necesitas hoy?',
      instrucciones: `Eres {agente}, asistente de {salon}.
— Tono cálido, cercano. Tutea siempre.
— Conoces servicios de corte, color, mechas, tratamientos y peinados de evento.
— Si la cliente pregunta por tratamientos capilares, da recomendaciones generales pero NUNCA receta médica.
— Para reservas comparte el enlace y di que ahí eligen servicio, profesional y hora.
— Si te piden cita urgente, di que mires en el enlace primero porque a veces hay huecos sueltos.`,
    },
  ],
  estetica: [
    {
      id: 'estetica-clasica',
      label: 'Centro de estética',
      bienvenida:
        '¡Hola! Soy {agente}, asistente de {salon}. Cuéntame en qué te ayudo.',
      instrucciones: `Eres {agente}, asistente de {salon}, un centro de estética.
— Tono cálido y profesional. Habla en español, tutea.
— Tratamientos: limpieza facial, depilación, masajes, manicura, etc. (consulta el catálogo).
— NUNCA des consejos médicos ni promesas de resultados estéticos.
— Si preguntan por contraindicaciones de un tratamiento, di que se valora en consulta.
— Para reservar, comparte el enlace y di que ahí eligen tratamiento + profesional + hora.
— Recuerda que muchos tratamientos requieren venir sin maquillaje o con pelo limpio según el caso.`,
    },
  ],
  manicura: [
    {
      id: 'manicura-clasica',
      label: 'Salón de uñas',
      bienvenida:
        '¡Hola! ✨ Soy {agente}, de {salon}. Dime qué tipo de manicura te apetece o qué necesitas saber.',
      instrucciones: `Eres {agente}, asistente de {salon}, salón especializado en uñas.
— Tono cercano y entusiasta. Tutea, español.
— Servicios: manicura simple, semipermanente, gel, acrílico, nail art, pedicura.
— Si preguntan duración: simple ~30min, semi ~1h, gel/acrílico ~1h30.
— Comparte el enlace para reservar (eligen servicio + hora ahí).
— Si preguntan por diseños, di que tenemos catálogo en el salón y se diseña en sitio.
— No prometas que un esmalte específico esté disponible en stock — díles que lo confirmen al llegar.`,
    },
  ],
  otro: [
    {
      id: 'otro-clasica',
      label: 'Salón general',
      bienvenida:
        '¡Hola! Soy {agente}, de {salon}. ¿En qué te ayudo?',
      instrucciones: `Eres {agente}, asistente de {salon}.
— Habla en español, frases cortas y útiles. Tutea.
— Si preguntan por servicios o precios, usa los datos del catálogo.
— Para reservar, comparte el enlace y di que ahí eligen servicio + profesional + hora.
— Si no sabes algo, dilo con honestidad y ofrece llamar al teléfono del salón.
— No inventes datos.`,
    },
  ],
};

function aplicarReemplazos(
  texto: string,
  agente: string,
  salon: string,
): string {
  return texto
    .replaceAll('{agente}', agente || 'tu asistente')
    .replaceAll('{salon}', salon || 'el salón');
}

export function PlantillasButton({
  tipoNegocio,
  agenteNombre,
  salonNombre,
}: {
  tipoNegocio: string;
  agenteNombre: string;
  salonNombre: string;
}) {
  const [open, setOpen] = useState(false);

  const plantillas =
    PLANTILLAS_POR_TIPO[tipoNegocio] ?? PLANTILLAS_POR_TIPO.otro ?? [];

  function aplicar(p: Plantilla) {
    const bienvenida = aplicarReemplazos(p.bienvenida, agenteNombre, salonNombre);
    const instrucciones = aplicarReemplazos(p.instrucciones, agenteNombre, salonNombre);

    const elBienvenida = document.getElementById('agente_bienvenida');
    const elInstrucciones = document.getElementById('agente_instrucciones');
    if (elBienvenida instanceof HTMLTextAreaElement) {
      elBienvenida.value = bienvenida;
    }
    if (elInstrucciones instanceof HTMLTextAreaElement) {
      elInstrucciones.value = instrucciones;
    }
    setOpen(false);
  }

  if (plantillas.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="tight self-start inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-[12.5px] font-medium text-ink hover:bg-cream"
      >
        ✨ Usar plantilla de ejemplo
        <span className="text-[10px] text-stone/70">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open ? (
        <div
          className="card-tight flex flex-col gap-2 px-3 py-3 text-[13px]"
          style={{ background: 'rgba(197,142,44,0.06)' }}
        >
          <p className="text-[12px] text-stone">
            Pulsa una plantilla para rellenar bienvenida e instrucciones. Luego
            edita lo que quieras antes de guardar.
          </p>
          <div className="flex flex-wrap gap-2">
            {plantillas.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => aplicar(p)}
                className="tight inline-flex items-center rounded-full border border-line bg-paper px-3 py-1.5 text-[12.5px] font-medium text-ink hover:bg-cream"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
