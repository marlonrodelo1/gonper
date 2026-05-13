# Tools nuevas para el bot Telegram del dueño

Branch: `feature/whatsapp-twilio`
Workflow n8n a actualizar: **`Gonper - Bot del salon (multi-tenant) v2`** (id `B26aw7VP89wVYvOL`)

Esta nota es para el agente que toca el workflow n8n. NO hace falta tocar la API: ya está desplegada con el nuevo registro de tools.

---

## Resumen de cambios en la API

- Endpoint dispatcher: `POST /api/v1/admin/tool` (sin cambios de URL ni auth — sigue siendo bearer `INTERNAL_API_TOKEN`).
- Body: `{ salon_id, tool, args? }`.
- Validación con Zod en server side; los args ahora se validan estrictamente.
- Catálogo dinámico vía `GET /api/v1/admin/tool` (auth bearer). Devuelve `{ tools: [{ name, categoria, descripcion, ejemplos }] }`. Útil si quieres que el workflow se autoconfigure.

---

## Tools nuevas

### 1) `crear_cita`

Crea una cita rápida desde el chat del dueño ("agenda a María mañana 16h corte").

**Args:**
```json
{
  "cliente_nombre": "María Pérez",
  "cliente_telefono": "+34611222333",
  "cliente_email": "maria@example.com",
  "servicio_nombre": "Corte",
  "inicio_iso": "2026-05-09T15:00:00.000Z",
  "profesional_nombre": "Lucía"
}
```

- `cliente_nombre` (obligatorio).
- `cliente_telefono` (opcional, recomendado — evita duplicar clientes).
- `cliente_email` (opcional — si está, el cliente recibe email de confirmación).
- `servicio_nombre` (obligatorio, búsqueda por LIKE case-insensitive). Si no encuentra o encuentra varios, devuelve `error` con mensaje claro.
- `inicio_iso` (obligatorio, ISO 8601 UTC, p.ej. `2026-05-09T15:00:00Z`). El LLM debe convertir "mañana 16h" usando la timezone del salón.
- `profesional_nombre` (opcional). Si solo hay 1 profesional activo, se autoasigna.

**Respuesta exitosa:**
```json
{
  "ok": true,
  "tool": "crear_cita",
  "result": {
    "ok": true,
    "cita_id": "uuid",
    "cliente_id": "uuid",
    "email_enviado": true,
    "mensaje": "✅ Cita creada para María Pérez el 09/05 a las 15:00 · Corte · 25.00€ · con Lucía (email enviado)."
  }
}
```

El campo `result.mensaje` es texto natural pensado para que el bot lo reenvíe tal cual al dueño.

**Errores típicos** (status 200 en HTTP, `result.ok=false`):
- `"No encontré ningún servicio que coincida con 'corte rápido'"`
- `"Hay varios servicios que coinciden con 'corte': "Corte mujer", "Corte caballero". Sé más específico."`
- `"Lucía ya tiene otra cita a esa hora."`
- `"No puedo crear citas en el pasado"`

### 2) `comando_help`

Devuelve un texto Markdown con todas las tools disponibles agrupadas por categoría (📅 Citas, 👥 Clientes, 💰 Números, ⚙️ Opciones). El listado es dinámico: si añadimos una tool, aparece automáticamente.

**Args:** `{}` (vacío).

**Respuesta:**
```json
{
  "ok": true,
  "tool": "comando_help",
  "result": {
    "mensaje": "*🤖 Soy tu asistente. Esto es lo que puedo hacer:*\n\n📅 *Citas*\n• Listar citas de hoy. — \"¿qué citas tengo hoy?\"\n• ..."
  }
}
```

El bot debe enviar `result.mensaje` con `parse_mode=Markdown`.

---

## Cambios a aplicar en el workflow `B26aw7VP89wVYvOL`

### A. Nodo `DeepSeek + tools` — añadir las 2 tools nuevas

En la lista de tools que se le pasa al LLM (en formato OpenAI/DeepSeek `function_calling`), añadir:

```json
{
  "type": "function",
  "function": {
    "name": "crear_cita",
    "description": "Crea una cita en el salón. Úsalo cuando el dueño te diga cosas como 'agenda a X mañana a las Y' o 'crea cita con Z el viernes 10:30'. Convierte la fecha relativa a ISO 8601 usando la timezone del salón (Europe/Madrid por defecto). Si el dueño no especifica profesional y solo hay uno, no pongas el campo y el sistema lo asignará.",
    "parameters": {
      "type": "object",
      "properties": {
        "cliente_nombre": { "type": "string", "description": "Nombre del cliente" },
        "cliente_telefono": { "type": "string", "description": "Teléfono del cliente (opcional, pero ayuda a no duplicar)" },
        "cliente_email": { "type": "string", "description": "Email del cliente (opcional). Si se pasa, recibe email de confirmación." },
        "servicio_nombre": { "type": "string", "description": "Nombre del servicio (corte, manicura, etc.)" },
        "inicio_iso": { "type": "string", "description": "Fecha y hora de inicio en ISO 8601, ej: 2026-05-09T15:00:00Z" },
        "profesional_nombre": { "type": "string", "description": "Nombre del profesional asignado. Omitir si solo hay uno." }
      },
      "required": ["cliente_nombre", "servicio_nombre", "inicio_iso"]
    }
  }
}
```

```json
{
  "type": "function",
  "function": {
    "name": "comando_help",
    "description": "Lista todas las cosas que el bot puede hacer. Llámalo cuando el dueño envíe '/help', 'ayuda' o pregunte qué puedes hacer.",
    "parameters": { "type": "object", "properties": {} }
  }
}
```

### B. System prompt — añadir contexto sobre las nuevas capacidades

En el system prompt del nodo DeepSeek, debajo del bloque de tools, añadir:

> Puedes crear citas con `crear_cita`. Para fechas relativas ("mañana", "el viernes") calcula la fecha exacta en la timezone del salón antes de llamar la tool. Pasa la hora local convertida a UTC (ej: si el salón está en Madrid y el dueño dice "mañana 16h", calcula esa hora en Europe/Madrid y conviértela a ISO UTC).
>
> Si el dueño escribe `/help` o pregunta qué puedes hacer, llama a `comando_help` y devuelve el campo `result.mensaje` tal cual con `parse_mode=Markdown`.
>
> Cuando llames a `crear_cita` y la respuesta tenga `result.ok=true`, devuelve `result.mensaje` directamente al dueño. Si `result.ok=false`, transmite `result.error` de forma natural (puedes reformular).

### C. Routing del comando `/help`

Añadir en el flujo de entrada (antes del LLM) un IF que detecte mensajes que sean exactamente `/help` o `/ayuda` y los enrute directo al nodo HTTP que llama `POST /api/v1/admin/tool` con `{ tool: "comando_help" }`. Esto ahorra una llamada al LLM en un caso trivial.

Pseudocódigo del IF:
```js
const txt = ($json.message?.text || '').trim().toLowerCase();
return txt === '/help' || txt === '/ayuda';
```

Si el match es `true`, ir directo a HTTP `comando_help` → Send Telegram con `parse_mode=Markdown`.
Si es `false`, seguir al LLM como hasta ahora.

### D. Nada que cambiar en autenticación

Sigue siendo `Authorization: Bearer {{ $env.INTERNAL_API_TOKEN }}` (o como esté guardado en credenciales n8n).

---

## Notificaciones push al dueño (informativo — ya implementadas en backend)

El backend ya notifica al dueño automáticamente vía Telegram cuando:

- Un cliente reserva por la web pública (`/s/<slug>/reservar`).
- Un cliente confirma su cita por email (`/c/<token>`).
- Un cliente cancela su cita por email (`/x/<token>`).

Estos avisos se envían **desde el bot del propio salón** (`salones.telegram_bot_token`) al `salones.telegram_chat_id_dueno`. **No requieren cambios en el workflow n8n** — son `fetch` directos a Telegram desde Next.js, fire-and-forget. Si fallan, se loguean y reportan a Sentry pero no bloquean nada.

Si se quisiera que esos avisos pasen también por n8n (por trazabilidad), habría que crear un webhook `n8n → /webhook/notificacion-dueno` y llamarlo desde `src/lib/telegram/notify.ts`. **No es necesario por ahora.**

---

## Test rápido (curl)

```bash
# 1) Listar catálogo de tools
curl -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
  https://gonperstudio.shop/api/v1/admin/tool

# 2) Help
curl -X POST -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"salon_id":"<UUID>","tool":"comando_help"}' \
  https://gonperstudio.shop/api/v1/admin/tool

# 3) Crear cita
curl -X POST -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "salon_id":"<UUID>",
    "tool":"crear_cita",
    "args":{
      "cliente_nombre":"María Pérez",
      "cliente_telefono":"+34611222333",
      "servicio_nombre":"Corte",
      "inicio_iso":"2026-05-09T15:00:00Z"
    }
  }' \
  https://gonperstudio.shop/api/v1/admin/tool
```
