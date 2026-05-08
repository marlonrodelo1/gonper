# Tool `compartir_tienda` — instrucciones para workflow n8n

Tool nueva del bot Telegram (modo dueño) que prepara material listo para
compartir el link de la tienda pública del salón. El dispatcher
`/api/v1/admin/tool` ya enruta automáticamente — sólo hay que añadirla al
function-calling del LLM y al system prompt del workflow del bot del dueño.

---

## Qué hace

Dado un `salon_id` (resuelto previamente por el workflow desde el chat de
Telegram del dueño):

1. Carga `salon.slug` y `salon.nombre`.
2. Construye `url_publica = https://gestori.es/s/<slug>`.
3. Construye un `mensaje_compartible` (usa `mensaje_personalizado` si el
   dueño lo dictó, si no genera uno por defecto en español).
4. Si llega `numero_destino`, lo normaliza a E.164 sin signos (`+34611...`,
   `00 34 611...`, `611...` → `34611...`) y devuelve un deep-link
   `https://wa.me/<numero>?text=<mensaje URL-encoded>` listo para tocar.
5. Genera URL del QR vía `/api/v1/qr?text=<URL>&size=512`.
6. Devuelve un campo `mensaje` con texto natural en Markdown listo para
   reenviar al dueño tal cual.

Multi-tenant aislado por `salon_id`. No toca DB de escritura.

---

## Endpoint

```
POST https://gestori.es/api/v1/admin/tool
Authorization: Bearer {{ $env.INTERNAL_API_TOKEN }}
Content-Type: application/json

{
  "salon_id": "<uuid del salón>",
  "tool": "compartir_tienda",
  "args": {
    "numero_destino": "+34611222333",       // opcional
    "mensaje_personalizado": "Hola Juan..."  // opcional
  }
}
```

Respuesta:

```json
{
  "ok": true,
  "tool": "compartir_tienda",
  "result": {
    "ok": true,
    "result": {
      "url_publica": "https://gestori.es/s/revolution",
      "mensaje_compartible": "Hola! Te dejo el link...",
      "whatsapp_link": "https://wa.me/34611222333?text=...",
      "qr_url": "https://gestori.es/api/v1/qr?text=...&size=512",
      "mensaje": "✅ Toca este link y WhatsApp se abrirá..."
    }
  }
}
```

El workflow debe enviar al chat de Telegram **literalmente el campo
`result.result.mensaje`** (con `parse_mode: Markdown`).

---

## Function-calling schema (DeepSeek / OpenAI)

Pegar en el array `tools` del nodo del LLM:

```json
{
  "type": "function",
  "function": {
    "name": "compartir_tienda",
    "description": "Prepara material para que el dueño comparta su link de reservas (URL pública del salón). Si el dueño da un número de teléfono, devuelve un deep-link de WhatsApp listo para enviar. Si no, devuelve el link, mensaje sugerido y QR. Llamar cuando el dueño diga cosas como 'comparte mi link', 'manda la tienda a Juan', 'pásame mi QR', 'comparte a +34611...'.",
    "parameters": {
      "type": "object",
      "properties": {
        "numero_destino": {
          "type": "string",
          "description": "Opcional. Número de teléfono del destinatario en formato internacional (+34611222333) o nacional (611222333, asume España). Si el dueño no lo da, omitir."
        },
        "mensaje_personalizado": {
          "type": "string",
          "maxLength": 300,
          "description": "Opcional. Mensaje específico que el dueño quiere enviar. Si no lo da, se usa uno por defecto en español."
        }
      },
      "additionalProperties": false
    }
  }
}
```

---

## Añadir al system prompt del bot del dueño

Añadir un bloque al system prompt del workflow del bot Telegram (modo
dueño), por ejemplo bajo la sección de "Crecimiento":

```
🚀 CRECIMIENTO
- compartir_tienda: cuando el dueño te diga "comparte mi link", "manda
  la tienda a Juan", "pásame el QR" o similares, llama a esta tool.
  · Si menciona un número o nombre con número (ej "manda a +34611...",
    "comparte a María 611222333"), pásalo en numero_destino.
  · Si dicta un texto específico ("dile que tenemos oferta..."), pásalo
    en mensaje_personalizado.
  · Si no, llámala sin args y devuelve el campo `mensaje` tal cual al
    dueño con parse_mode Markdown.
```

---

## Ejemplos de invocación

| Mensaje del dueño en Telegram | Args que el LLM debe pasar |
|---|---|
| "comparte mi link" | `{}` |
| "manda mi tienda a +34611222333" | `{ "numero_destino": "+34611222333" }` |
| "comparte a María 611222333" | `{ "numero_destino": "611222333" }` |
| "envía el link a Juan: 'Hola Juan, reserva aquí cuando quieras'" | `{ "mensaje_personalizado": "Hola Juan, reserva aquí cuando quieras" }` |
| "pásame el QR de la tienda" | `{}` |

---

## Notas

- La tool aparece automáticamente en `/help` bajo la categoría
  `🚀 *Crecimiento*` (categoría nueva creada al registrarla).
- El endpoint dispatcher no requiere cambios — ya enruta por `tool` name.
- Sin dependencias externas: la URL del QR ya existe en la app.
- Multi-tenant: el aislamiento se garantiza por `salon_id` que el
  workflow ya resuelve antes (igual que el resto de tools).
