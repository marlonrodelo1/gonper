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
  const html = `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#18181b">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f4f5;padding:40px 16px">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)">
        <tr><td style="padding:32px 32px 16px">
          <h1 style="margin:0 0 8px;font-size:24px;background:linear-gradient(90deg,#a855f7,#ec4899);-webkit-background-clip:text;background-clip:text;color:transparent">
            ¡Reserva confirmada!
          </h1>
          <p style="margin:0;color:#52525b;font-size:14px">Hola ${escapeHtml(p.clienteNombre)} 👋</p>
        </td></tr>
        <tr><td style="padding:0 32px 16px">
          <p style="margin:0 0 12px;font-size:15px;line-height:1.5">
            Soy <strong>${escapeHtml(p.agenteNombre)}</strong>, te confirmo tu reserva en <strong>${escapeHtml(p.salonNombre)}</strong>.
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fafafa;border-radius:8px;padding:16px;font-size:14px">
            <tr><td style="padding:6px 0;color:#71717a">Servicio</td><td align="right" style="padding:6px 0">${escapeHtml(p.servicio)}</td></tr>
            <tr><td style="padding:6px 0;color:#71717a">Profesional</td><td align="right" style="padding:6px 0">${escapeHtml(p.profesional)}</td></tr>
            <tr><td style="padding:6px 0;color:#71717a">Fecha y hora</td><td align="right" style="padding:6px 0"><strong>${escapeHtml(p.fechaHora)}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#71717a">Precio</td><td align="right" style="padding:6px 0">${escapeHtml(p.precio)}</td></tr>
          </table>
        </td></tr>
        ${
          p.salonDireccion
            ? `<tr><td style="padding:8px 32px"><p style="margin:0;font-size:13px;color:#52525b">📍 ${escapeHtml(p.salonDireccion)}</p></td></tr>`
            : ''
        }
        ${
          p.salonTelefono
            ? `<tr><td style="padding:0 32px"><p style="margin:0;font-size:13px;color:#52525b">📞 ${escapeHtml(p.salonTelefono)}</p></td></tr>`
            : ''
        }
        <tr><td style="padding:24px 32px;border-top:1px solid #f4f4f5">
          <p style="margin:0;font-size:13px;color:#71717a;line-height:1.5">
            Te enviaré un recordatorio una hora antes para que confirmes la cita.<br>
            Si necesitas cancelar, responde a este email o contacta directamente con el salón.
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px 32px;background:#fafafa">
          <p style="margin:0;font-size:11px;color:#a1a1aa;text-align:center">
            Enviado por Gomper · ${escapeHtml(p.salonNombre)}
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
