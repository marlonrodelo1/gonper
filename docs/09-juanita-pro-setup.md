# Juanita Pro — Agente del dueño en panel

Este es el chat que aparece en `/panel/hoy` (componente
`JuanitaPro` → [src/app/panel/_components/juanita-pro.tsx](../src/app/panel/_components/juanita-pro.tsx)).
El dueño escribe en lenguaje natural y la IA responde con datos reales del salón.

## Arquitectura

```
Panel (Next.js) ─POST─▶ /api/v1/juanita-pro
                          │ (auth: cookie Supabase, salon vía getCurrentSalon)
                          ▼
                       fetch ─POST─▶ N8N_JUANITA_WEBHOOK_URL
                                      │
                                      ▼
                                Workflow n8n "Gomper · Juanita Pro"
                                  ├─ Webhook trigger
                                  ├─ Lookup salón (Supabase REST)
                                  ├─ AI Agent (DeepSeek + memoria)
                                  │    └─ Tools HTTP a Supabase REST:
                                  │         tool_citas_hoy
                                  │         tool_citas_periodo
                                  │         tool_top_clientes
                                  │         tool_clientes_no_shows
                                  │         tool_servicios
                                  │         tool_info_salon
                                  └─ Respond to Webhook
```

## Componentes desplegados

- **Workflow n8n**: `Gomper · Juanita Pro (agente del dueño)`
  - ID: `LaRObDbGlb0WdB57`
  - URL n8n: <https://rogotech-n8n.qyklvu.easypanel.host>
  - Webhook path producción: `/webhook/gomper-juanita-pro`
- **Credencial n8n**: `Supabase Gomper (REST)` (httpCustomAuth con apikey + Authorization Bearer)
- **Modelo LLM**: DeepSeek (credencial existente `HDvHmnt1fCKhP5GR`)
- **Endpoint Next.js**: [src/app/api/v1/juanita-pro/route.ts](../src/app/api/v1/juanita-pro/route.ts)

## Variables de entorno

Añadir en `.env.local` (local) y en Dokploy (producción):

```
N8N_JUANITA_WEBHOOK_URL=https://rogotech-n8n.qyklvu.easypanel.host/webhook/gomper-juanita-pro
INTERNAL_API_TOKEN=                # opcional; si lo pones, también añádelo como header check en n8n
```

Si `N8N_JUANITA_WEBHOOK_URL` falta, el endpoint devuelve 503 con mensaje claro.

## Flujo de la petición

1. Usuario escribe en el chat de `/panel/hoy`.
2. `JuanitaPro` UI hace `POST /api/v1/juanita-pro` con `{message, session_id?}`.
3. El endpoint:
   - Verifica usuario autenticado vía `supabase.auth.getUser()`.
   - Carga salón vía `getCurrentSalon()`.
   - Genera `session_id = salon_id:user_id` si no viene.
   - Hace `POST` al webhook n8n con `{salon_id, user_id, message, session_id}`.
4. El workflow:
   - Lookup del salón en Supabase REST (con la credencial httpCustomAuth).
   - Construye contexto (nombre, tipo de negocio, timezone, agente_nombre).
   - Pasa al AI Agent (DeepSeek) con system prompt anti-invención.
   - El agente decide qué tool llamar según la pregunta.
   - Cada tool hace una query directa a Supabase PostgREST con `salon_id` inyectado automáticamente del contexto.
   - El agente compone respuesta en lenguaje natural.
5. Webhook devuelve `{reply, session_id}` al endpoint Next.js.
6. UI renderiza el mensaje.

La memoria del agente usa `session_id` como key, así que cada combinación salón+usuario tiene conversación independiente.

## Probar manualmente

```bash
curl -sS -X POST 'https://rogotech-n8n.qyklvu.easypanel.host/webhook/gomper-juanita-pro' \
  -H 'Content-Type: application/json' \
  -d '{
    "salon_id": "3cbb61f5-8d4d-4bc8-abaa-d0d4f5e1eccf",
    "user_id": "test",
    "message": "¿cuántas citas tuve esta semana?",
    "session_id": "test-001"
  }'
```

## Limitaciones conocidas

- **Solo lectura** — no puede crear/cancelar citas. Si el dueño lo pide, el agente le redirige a la pestaña Agenda.
- **No filtro de fechas dinámico** en `tool_citas_periodo` (devuelve últimas N por defecto). El agente filtra mentalmente al presentar.
- **Sin trigger Telegram** — esta primera iteración solo expone el agente vía el chat del panel. Cuando se conecte un bot Telegram al workflow, el dueño podrá hablar con Juanita Pro también desde Telegram.

## Próximos pasos sobre este workflow

1. Añadir trigger Telegram en paralelo al webhook (mismo agente, mismas tools, distinto canal).
2. Añadir tools de escritura: crear cita, cancelar cita, bloquear hueco — vía endpoints internos `/api/v1/agent/*` con `INTERNAL_API_TOKEN`.
3. Ampliar tools de lectura: facturación con agregación SQL, vista semanal, comparativas vs media.
4. Personalizar nombre del agente por salón (ya soportado: usa `agente_nombre` de la fila `salones`).
