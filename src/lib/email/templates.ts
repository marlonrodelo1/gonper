interface ReservaConfirmadaParams {
  clienteNombre: string;
  salonNombre: string;
  salonDireccion?: string | null;
  salonTelefono?: string | null;
  servicio: string;
  profesional: string;
  fechaHora: string; // ya formateado en español
  precio: string; // formateado
  agenteNombre: string; // ej "Juanita"
  urlSalon?: string; // url pública del salón
}

export function renderReservaConfirmadaEmail(p: ReservaConfirmadaParams): {
  subject: string;
  html: string;
} {
  const subject = `Reserva confirmada en ${p.salonNombre}`;
  // Paleta Gonper Studio
  const COLOR_BG = '#F7F3EC';
  const COLOR_PAPER = '#FBF8F2';
  const COLOR_INK = '#1A1815';
  const COLOR_STONE = '#6B6356';
  const COLOR_TERRACOTTA = '#C5562C';
  const COLOR_LINE = '#E5DFD3';
  const html = `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:${COLOR_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${COLOR_INK}">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${COLOR_BG};padding:40px 16px">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="background:${COLOR_PAPER};border:1px solid ${COLOR_LINE};border-radius:16px;overflow:hidden">
        <tr><td style="padding:28px 32px 8px">
          <div style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:${COLOR_STONE}">Gonper Studio · ${escapeHtml(p.salonNombre)}</div>
        </td></tr>
        <tr><td style="padding:8px 32px 16px">
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:500;line-height:1.2;color:${COLOR_INK}">
            Tu cita está reservada
          </h1>
          <p style="margin:0;color:${COLOR_STONE};font-size:14px">Hola ${escapeHtml(p.clienteNombre)}.</p>
        </td></tr>
        <tr><td style="padding:0 32px 16px">
          <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:${COLOR_INK}">
            Soy <strong>${escapeHtml(p.agenteNombre)}</strong>, te confirmo tu reserva en <strong>${escapeHtml(p.salonNombre)}</strong>.
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${COLOR_BG};border:1px solid ${COLOR_LINE};border-radius:12px;padding:16px;font-size:14px">
            <tr><td style="padding:6px 0;color:${COLOR_STONE}">Servicio</td><td align="right" style="padding:6px 0">${escapeHtml(p.servicio)}</td></tr>
            <tr><td style="padding:6px 0;color:${COLOR_STONE}">Profesional</td><td align="right" style="padding:6px 0">${escapeHtml(p.profesional)}</td></tr>
            <tr><td style="padding:6px 0;color:${COLOR_STONE}">Fecha y hora</td><td align="right" style="padding:6px 0"><strong>${escapeHtml(p.fechaHora)}</strong></td></tr>
            <tr><td style="padding:6px 0;color:${COLOR_STONE}">Precio</td><td align="right" style="padding:6px 0">${escapeHtml(p.precio)}</td></tr>
          </table>
        </td></tr>
        ${
          p.salonDireccion
            ? `<tr><td style="padding:8px 32px"><p style="margin:0;font-size:13px;color:${COLOR_STONE}">📍 ${escapeHtml(p.salonDireccion)}</p></td></tr>`
            : ''
        }
        ${
          p.salonTelefono
            ? `<tr><td style="padding:0 32px"><p style="margin:0;font-size:13px;color:${COLOR_STONE}">📞 ${escapeHtml(p.salonTelefono)}</p></td></tr>`
            : ''
        }
        <tr><td style="padding:24px 32px;border-top:1px solid ${COLOR_LINE}">
          <p style="margin:0;font-size:13px;color:${COLOR_STONE};line-height:1.55">
            Te enviaré un recordatorio dos horas antes para que confirmes tu asistencia.<br>
            Si necesitas cancelar, responde a este email o contacta directamente con el salón.
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px 28px;border-top:1px solid ${COLOR_LINE}">
          <p style="margin:0;font-size:11px;color:${COLOR_STONE};text-align:center">
            Reservado a través de <a href="https://gonperstudio.shop" style="color:${COLOR_TERRACOTTA};text-decoration:none">gonperstudio.shop</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
  return { subject, html };
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
