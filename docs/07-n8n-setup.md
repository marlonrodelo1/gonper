# Fase 4 · Bot de Telegram en n8n

Esta guía describe cómo desplegar el **bot de Telegram** que atiende a los clientes finales del salón y el **cron de recordatorios** que avisa 1h antes de cada cita. Toda la lógica vive en **n8n**; la app de Gomper expone una API REST v1 (autenticada con `Authorization: Bearer <INTERNAL_API_TOKEN>`) y los workflows son los que la consumen.

---

## 1. Resumen

Hay dos workflows complementarios:

1. **Gomper · Bot del salón** (`docs/n8n-workflow-bot-cliente.json`)
   - Recibe los `update` de Telegram en un webhook.
   - Atiende los comandos guiados: `/start <slug>`, "Reservar", "Mis citas", "Precios", "Horario".
   - Llama a `GET /api/v1/salones/<slug>/disponibilidad`, `POST /api/v1/salones/<slug>/citas` y `GET /api/v1/salones/<slug>/citas` con Header Auth.
   - Mantiene mini-estado por chat con los nodos `Set` (servicio elegido → profesional → fecha → hora → datos del cliente → confirmación).
   - Procesa también los callbacks `confirmar:<cita_id>` y `cancelar:<cita_id>` que llegan desde los recordatorios.

2. **Gomper · Cron recordatorios** (`docs/n8n-workflow-recordatorios.json`)
   - Schedule Trigger cada 5 minutos.
   - Llama a `POST /api/v1/cron/recordatorios` (la API marca atómicamente las citas y devuelve las nuevas que entran en la ventana 50–70 min).
   - Itera con Split In Batches y manda un `sendMessage` por cita al `cliente.telegramId` con botones "Confirmar" / "Cancelar". Los callbacks los procesa el workflow del bot.

Ambos se hablan vía la API REST: la API es la única fuente de verdad. n8n no toca la base de datos directamente.

---

## 2. Pre-requisitos

- **Bot de Telegram creado**: hablar con [@BotFather](https://t.me/BotFather), `/newbot`, guardar el `token` (formato `123456:ABC...`).
- **Bot configurado en el panel del salón**: en `https://gestori.es/panel/config/bot` → pegar el token. El backend lo guarda en `salones.telegram_bot_token` y la API de recordatorios ya lo devuelve.
- **n8n self-hosted o cloud** alcanzable públicamente vía HTTPS (los webhooks de Telegram requieren HTTPS válido).
- **URL pública de la app**, ej. `https://gestori.es`.
- **`INTERNAL_API_TOKEN`** ya configurado como variable de entorno en el deploy de la app (Dokploy → service env). Misma cadena se usa al configurar la credencial de n8n.
- **Slug del salón** (ej. `salon-demo`). Es el identificador público del salón en la URL.

---

## 3. Credenciales a crear en n8n

Crear en `Settings → Credentials` antes de importar los workflows.

### 3.1 `Header Auth Gomper API` (HTTP Header Auth)

| Campo | Valor |
|---|---|
| Name | `Header Auth Gomper API` |
| Header Auth | `Authorization` |
| Value | `Bearer <INTERNAL_API_TOKEN>` |

Reutilizable por todos los nodos `HTTP Request` que llamen a `gestori.es/api/v1/*`.

### 3.2 `Telegram Bot Salón Demo` (Telegram API)

| Campo | Valor |
|---|---|
| Name | `Telegram Bot Salón Demo` |
| Access Token | el token del bot (de @BotFather) |

Si gestionas varios salones con n8n único, crea **una credencial Telegram por salón** y duplica los workflows (o usa Switch por `chat.username` del bot). Para empezar, asume un bot por salón.

---

## 4. Importar el workflow del bot

1. n8n → `Workflows` → `Import from File` → seleccionar `docs/n8n-workflow-bot-cliente.json`.
2. Abrir cada nodo y enlazar la credencial correcta:
   - Nodos `Telegram Trigger` y `Telegram` → credencial `Telegram Bot Salón Demo`.
   - Nodos `HTTP Request` → credencial `Header Auth Gomper API`.
3. Editar el nodo **`Set Config`** y ajustar:
   - `apiBaseUrl` → `https://gestori.es` (o la URL pública del deploy).
   - `defaultSlug` → `salon-demo` (slug que se usa si el `/start` no trae parámetro).
4. Guardar y **activar** el workflow (toggle arriba a la derecha).
5. Copiar la URL del `Telegram Trigger` (en el nodo, pestaña `Webhook URLs` → `Production URL`).
6. Registrar el webhook en Telegram (una sola vez por bot):

   ```
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<URL_PRODUCTION_DEL_TRIGGER>"
   ```

   Verificar con `curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"` que `url` y `pending_update_count: 0` están bien.

### Deep link público (QR + redes)

El cliente no escribe el slug a mano. Genera el link así:

```
https://t.me/<NOMBRE_DEL_BOT>?start=salon-demo
```

Ese link, al pulsarlo, abre Telegram y envía automáticamente `/start salon-demo` al bot. Es lo que pones en el QR de la pared del salón, en la firma de email, en Instagram, etc.

---

## 5. Importar el workflow de recordatorios

1. Importar `docs/n8n-workflow-recordatorios.json`.
2. Enlazar credenciales:
   - Nodo HTTP `POST /cron/recordatorios` → `Header Auth Gomper API`.
   - Nodo `Send Telegram` → `Telegram Bot Salón Demo`.
3. Editar `Set Config` y poner `apiBaseUrl`.
4. Activar. El `Schedule Trigger` corre cada 5 minutos.

La API es **idempotente y atómica**: usa `UPDATE ... FOR UPDATE SKIP LOCKED` y marca `recordatorio_enviado_at`, así que aunque el cron se solape o se duplique, cada cita recibe el aviso una sola vez.

---

## 6. Probar end-to-end

1. Abrir `https://t.me/<bot>?start=salon-demo` desde el móvil.
2. Verificar que el bot responde con menú (Reservar / Mis citas / Precios / Horario).
3. Pulsar **Reservar** → elegir servicio → elegir profesional → elegir fecha → elegir hora → escribir nombre y teléfono → confirmar.
4. En el panel `https://gestori.es/panel/agenda` debería aparecer la cita en estado `pendiente`.
5. Crear manualmente (o esperar) una cita cuya hora de inicio caiga en los próximos 50–70 minutos. En el siguiente tick del cron (máximo 5 min) llega el recordatorio al chat de Telegram.
6. Pulsar **✅ Confirmar** → en el panel la cita pasa a `confirmada` y el bot responde "Genial, te esperamos".
7. Pulsar **❌ Cancelar** en otra cita → estado `cancelada`, motivo `cliente`.

---

## 7. Personalizar el agente con Juanita (Gemini Flash)

El bot atiende **comandos guiados** por defecto (botones inline). Eso cubre el 90% de los casos sin necesidad de IA y ahorra tokens.

Para los mensajes de **texto libre** (cliente que escribe "¿hay hueco mañana por la tarde?"), añade un nodo IA en la rama `Switch → free text`:

1. Insertar nodo `Google Gemini Chat Model` (o `HTTP Request` a la API de Gemini si no tienes la integración) entre el `Switch` y el `Telegram sendMessage`.
2. **System prompt** (carga las variables del salón con un `HTTP Request` previo a `/api/v1/salones/<slug>` o léelas del estado):

   ```
   Eres Juanita, asistente del salón {{salon.nombre}} en {{salon.ciudad}}.
   Tono: cercano, profesional, breve. Responde SOLO sobre el salón:
   servicios, precios, horario, ubicación y disponibilidad.

   Servicios: {{servicios_resumen}}
   Horario: {{horario_resumen}}
   Si el cliente quiere reservar, dile que pulse "Reservar" en el menú.
   Si la pregunta no es del salón, redirige amablemente.

   Hoy es {{$now.toFormat("EEEE d 'de' LLLL 'de' yyyy")}}.
   ```

3. **User input**: `{{ $json.message.text }}`.
4. La salida del modelo se manda directo con `Telegram sendMessage`.

**Recomendación**: deja la IA solo en el fallback (texto libre). Toda la reserva en sí pásala por botones — es más fiable, más barato y menos propenso a alucinar fechas.

---

## 8. Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| `401 Unauthorized` en HTTP nodes | Falta o mal formado el header `Authorization` | Verificar que la credencial Header Auth tiene exactamente `Bearer <token>` (con el espacio). Token igual al `INTERNAL_API_TOKEN` del .env de la app. |
| `404 Salón no encontrado` | Slug mal escrito o salón inactivo | Comprobar `salones.slug` y `salones.activo = true` en la BD. |
| Bot no recibe mensajes | Webhook mal registrado | `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo` y revisar `last_error_message`. Re-ejecutar `setWebhook`. |
| n8n responde pero el bot no contesta al usuario | El nodo Telegram falla en silencio | Abrir la ejecución en n8n → ver el output del nodo Telegram. Suele ser `chat_id` mal pasado o `parse_mode` inválido en el texto. |
| Recordatorios duplicados | Workflow activo en dos instancias de n8n | Solo una instancia del workflow `Cron recordatorios` activa a la vez. La API ya es idempotente, pero vale la pena evitarlo. |
| `409 SLOT_OCUPADO` al reservar | Otro cliente cogió ese hueco entre `disponibilidad` y `citas` | Volver a llamar `disponibilidad` y mostrar slots actualizados. El bot ya re-pregunta hora si recibe 409. |
| `409 ya estaba cancelada` al pulsar Cancelar dos veces | Doble click en el botón | No es bug. Responder al usuario "Cita ya cancelada" y seguir. |
| Recordatorio nunca llega | `salones.telegram_bot_token` vacío o `clientes.telegram_id` null | Asegurar que el cliente reservó por Telegram (no web) y que el panel tiene el token. La API devuelve `salon.telegramBotToken` en cada recordatorio — el workflow lo usa para enviar. |
| Texto del mensaje sale literal sin formato | Falta `parse_mode: "HTML"` o caracteres reservados de Markdown | Usar HTML siempre y escapar `<`, `>`, `&` en variables. |

---

## 9. Endpoints de la API v1 que usa el bot

| Método | Ruta | Uso |
|---|---|---|
| `GET` | `/api/v1/salones/<slug>/disponibilidad?servicio_id=&fecha=YYYY-MM-DD&profesional_id=` | Slots disponibles para un día |
| `POST` | `/api/v1/salones/<slug>/citas` | Crear cita (body con servicio, profesional, inicio, cliente, origen) |
| `GET` | `/api/v1/salones/<slug>/citas?cliente_telegram_id=` | Listar próximas citas de un cliente |
| `POST` | `/api/v1/citas/<id>/confirmar` | Confirmar una cita pendiente |
| `POST` | `/api/v1/citas/<id>/cancelar` | Cancelar (body opcional `{motivo, cancelada_por}`) |
| `POST` | `/api/v1/cron/recordatorios` | Devuelve citas que necesitan recordatorio (atómico) |

Todos requieren `Authorization: Bearer <INTERNAL_API_TOKEN>`.

---

## 10. Extender el workflow

El JSON incluido cubre los comandos clave. Para añadir más, conecta nuevas ramas al `Switch principal`:

- **Precios**: `HTTP GET` al catálogo del salón (cuando exista el endpoint público) → `Telegram sendMessage` con la lista.
- **Horario**: respuesta estática leída del salón.
- **Ubicación**: `Telegram sendLocation` con `latitude` y `longitude` del salón.
- **Cancelar mi cita**: similar a "Mis citas" pero con botón inline `cancelar:<cita_id>` en cada item.

Mantén el patrón: **un nodo `Set` por entidad** (servicio, profesional, fecha, hora, cliente) que va acumulando el estado del flujo y se referencia con `{{ $('Set Servicio').item.json.servicio_id }}` desde nodos posteriores.
