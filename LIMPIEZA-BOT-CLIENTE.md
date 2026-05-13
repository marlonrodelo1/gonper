# Limpieza bot Telegram cliente — pendientes en n8n

**Contexto:** En España nadie usa Telegram para hablar con negocios. Toda la
comunicación con el CLIENTE FINAL pasa ahora por email (recordatorios,
confirmar/cancelar) y, en el corto plazo, WhatsApp via Twilio. El bot
Telegram solo sirve al DUEÑO del salón (Juanita Pro).

Este documento lista los cambios pendientes en los workflows n8n para otro
agente que los ejecute. Yo (este agente) **no he tocado los workflows
directamente** — sólo he limpiado el código Next.js.

---

## Workflows afectados

### 1. `Gonper Studio - Bot del salon (multi-tenant) v2` — id `B26aw7VP89wVYvOL`

**NO BORRAR.** Sigue siendo el webhook que recibe updates del bot Telegram
del dueño (vinculación con `/start dueno-<token>`, comandos del dueño,
inline buttons que pulsa el dueño, etc.).

Lo que hay que **simplificar**:

- **Identificación dueño vs cliente.** Hoy el flujo distingue por
  `chat_id == salones.telegram_chat_id_dueno`. Mantener esa rama. Eliminar
  la rama "cliente" entera: cualquier mensaje cuyo `chat_id` NO sea el del
  dueño debe responderse con un mensaje fijo del estilo:

  > "Este bot es solo para el dueño del salón. Si quieres reservar cita,
  > visita https://gonperstudio.shop/{salon_slug}/reservar — te atendemos por la
  > web en menos de 30 segundos."

  …y terminar el flujo. No llamar a DeepSeek, no consultar BD, no llamar a
  los endpoints `/api/v1/salones/{slug}/citas` ni `/disponibilidad` (que
  YA HE BORRADO del código — ver sección "Endpoints eliminados" más abajo).

- **Branches a borrar dentro del workflow** (referenciados en
  `docs/n8n-workflow-bot-cliente.json`, que es la copia v1; la v2 viva en
  Dokploy debe tener equivalentes):
  - `Build /start menu` (menú de cliente con servicios / mis citas / etc.)
  - `Build servicios list`
  - `Build profesionales list`
  - `Build fecha selector`
  - `Build disponibilidad URL` (llamaba a
    `GET /api/v1/salones/{slug}/disponibilidad` — el endpoint ya no existe)
  - `Build resumen reserva`
  - `Build POST cita` (llamaba a
    `POST /api/v1/salones/{slug}/citas` — el endpoint ya no existe)
  - `Build mis citas URL` (llamaba a
    `GET /api/v1/salones/{slug}/citas?cliente_telegram_id=...` — endpoint
    ya no existe)
  - `Build confirmar URL` (POST a `/api/v1/citas/{id}/confirmar` — endpoint
    ya no existe)
  - `Build cancelar URL` (POST a `/api/v1/citas/{id}/cancelar` — endpoint
    ya no existe)
  - Cualquier rama del `Router intent` que reciba mensajes de cliente.

- **System prompt en el nodo LLM (DeepSeek).** Si hay un nodo `node-llm-tools`
  o similar con un system prompt que distingue cliente vs dueño, **eliminar
  toda la parte del prompt cliente**. Dejar solo el bloque del dueño
  (Juanita Pro: tools `proximas_citas`, `ingresos_mes`, `cancelar_cita`,
  `mover_cita`, `marcar_como_realizada`, etc., todas vía
  `POST /api/v1/admin/tool` que SÍ sigue existiendo).

- **Webhook setup en `panel/config/bot/actions.ts`.** El `setBotWebhook`
  sigue apuntando a `N8N_BOT_CLIENTE_WEBHOOK_URL` (variable de entorno con
  default `https://rogotech-n8n.qyklvu.easypanel.host/webhook/gestori-bot`).
  El nombre lleva "cliente" por legado pero el endpoint ahora sirve solo
  al dueño. **No es urgente renombrar** la variable ni el path; si quieres
  cambiarlo, renombra:
  - Variable env: `N8N_BOT_CLIENTE_WEBHOOK_URL` → `N8N_BOT_DUENO_WEBHOOK_URL`
  - Path n8n: `/webhook/gestori-bot` puede quedarse igual.
  Si lo renombras, actualiza también `src/app/panel/config/bot/actions.ts`.

### 2. `Gonper Studio - Recordatorios cron` — workflow de recordatorios

El endpoint `POST /api/v1/cron/recordatorios` que devuelve la lista de
citas cuya hora está dentro de la ventana 110–130 min ha sido modificado:

- **Ya NO devuelve** `cliente.telegramId` ni `salon.telegramBotToken` en
  el JSON de respuesta.
- **Sí devuelve** `cliente.email`, `cliente.telefono` y
  `cliente.whatsappPhone`.

El workflow n8n de recordatorios debe ahora, para cada item del array
`recordatorios`:

1. Si `cliente.email` existe → enviar email con Resend (template ya
   existente, llama a `/api/v1/email/recordatorio`).
2. Si `cliente.whatsappPhone` existe Y el dueño tiene Twilio configurado
   → enviar WhatsApp (workflow Twilio ya integrado en el commit
   `feat(whatsapp): integración Twilio para recordatorios automáticos`).
3. Eliminar cualquier rama que envíe el recordatorio por Telegram al
   cliente (usando `cliente.telegramId` y `salon.telegramBotToken`). Esos
   campos ya no llegan en el payload — la rama Telegram quedará rota si
   no se borra.

---

## Endpoints eliminados del código Next.js

Si el workflow llama a alguno de estos, fallará con 404. Hay que quitar
las llamadas:

| Endpoint borrado | Quién lo usaba | Reemplazo |
|---|---|---|
| `POST /api/v1/salones/{slug}/citas` | Cliente Telegram al reservar | El cliente reserva por web (`/s/{slug}/reservar`, server action) |
| `GET  /api/v1/salones/{slug}/citas?cliente_telegram_id=` | Cliente Telegram para "Mis citas" | Sin reemplazo: el cliente ya no consulta sus citas por Telegram |
| `GET  /api/v1/salones/{slug}/disponibilidad` | Cliente Telegram al elegir hora | Sin reemplazo: el cliente ve disponibilidad en `/s/{slug}/reservar` |
| `POST /api/v1/citas/{id}/confirmar` | Cliente Telegram inline button | Email tokens (`/c/{token}`) y WhatsApp via `/api/v1/citas/responder` |
| `POST /api/v1/citas/{id}/cancelar` | Cliente Telegram inline button | Email tokens (`/x/{token}`) y WhatsApp via `/api/v1/citas/responder` |

---

## Endpoints que NO se han tocado (siguen vivos, son del dueño)

| Endpoint | Para qué |
|---|---|
| `POST /api/v1/admin/tool` | Tools del dueño (cancelar/mover cita, ingresos, etc.) — Juanita Pro |
| `POST /api/v1/admin/vinculacion/canjear` | Canje de token HMAC del dueño con `/start dueno-<token>` |
| `GET  /api/v1/lookup-bot` | El workflow lo usa para identificar el salón a partir del token del bot al recibir update |
| `POST /api/v1/cron/recordatorios` | Cron de recordatorios (modificado: ahora devuelve email/whatsapp, no telegram cliente) |
| `POST /api/v1/citas/responder` | Inline buttons WhatsApp (y antes Telegram cliente, que ya no llegará) |
| `POST /api/v1/email/recordatorio` | Envío de email de recordatorio |

---

## Resumen para el agente que actualice los workflows

1. Abre el workflow `Gonper Studio - Bot del salon (multi-tenant) v2` en n8n
   (`https://n8n.gonperstudio.shop`, id `B26aw7VP89wVYvOL`).
2. Identifica la rama "cliente" (todo lo que NO es `chat_id ==
   telegram_chat_id_dueno`).
3. Sustitúyela por una respuesta fija que redirige a la web pública del
   salón.
4. Borra los nodos que llaman a los endpoints eliminados (ver tabla).
5. Limpia el system prompt del LLM para dejar solo el bloque del dueño.
6. Abre el workflow de recordatorios cron y elimina la rama Telegram
   cliente; deja solo email + WhatsApp.
7. Probar:
   - Vinculación dueño con `/start dueno-<token>` sigue funcionando.
   - Mensaje del dueño dispara tools admin correctamente.
   - Mensaje de un usuario que NO es el dueño recibe la respuesta fija.
   - Recordatorio cron envía email a cliente con email; envía WhatsApp si
     tiene whatsappPhone; nadie recibe Telegram.
