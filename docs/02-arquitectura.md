# Gonper Studio — Arquitectura técnica

> **Cambio mayor (2026-05-19)**: hemos apagado n8n. La orquestación
> (webhooks Telegram, crons, LLM con tool calling) vive ahora en Next.js.
> Esta nota documenta el estado actual.

## Stack tecnológico

| Capa | Tecnología | Por qué |
|---|---|---|
| Frontend & API | Next.js 16 (App Router) + TypeScript + React 19 | SSR/RSC, server actions, todo en un mismo runtime |
| Estilos | Tailwind 4 + shadcn/ui | Consistencia + velocidad |
| Base de datos | PostgreSQL (Supabase EU) | RLS multi-tenant, region EU |
| ORM | Drizzle | Type-safe, server-only |
| Auth | Supabase Auth | Email + password con SSR cookies |
| Hosting | Dokploy en VPS propio | Deploy atómico, control total |
| Scheduler | systemd timers en el VPS | 0 dependencia externa, logs en journalctl |
| Mensajería | Telegram Bot API (multi-bot por tenant) | Free + multi-tenant simple |
| LLM | DeepSeek V3 (chat) + Gemini 2.5 Flash (opcional) | Coste mínimo, function calling |
| Pagos | Stripe Checkout + Portal + Webhook | Estándar SaaS |
| Email | Resend | Transaccional fácil |
| Errores | Sentry (EU) | Free tier suficiente |
| Analytics | PostHog (EU) | Feature flags + product analytics |

## Diagrama general

```
                    ┌────────────────────────────────────────┐
                    │  CLIENTES FINALES                      │
                    │  Web pública del salón (gonperstudio.shop/s/[slug])  │
                    │  Chat de la tienda → DeepSeek + tools  │
                    └─────────────────┬──────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────┐
│  Next.js 16 (Dokploy en VPS)                                     │
│  • app.gonperstudio.shop  (panel del dueño)                       │
│  • gonperstudio.shop/s/[slug]  (web pública del salón)            │
│  • /api/public/chat/[slug]   chat tienda (DeepSeek + tools)       │
│  • /api/public/chat/royce    chat landing (Royce)                 │
│  • /api/telegram/[bot_username]  webhook bot del salón            │
│  • /api/telegram/royce       webhook bot Royce (admin Marlon)     │
│  • /api/v1/cron/recordatorios   cron recordatorios 2h             │
│  • /api/cron/trial-recordatorios cron emails fin-de-trial         │
└──────────────────┬──────────────────────┬────────────────────────┘
                   │                      │
                   ▼                      ▼
       ┌──────────────────┐    ┌──────────────────────┐
       │ systemd timer    │    │ Supabase Postgres EU │
       │ (mismo VPS)      │    │ + RLS multi-tenant   │
       │ • 5 min          │    │ + Auth               │
       │ • diario 09:00   │    │ + Storage (fotos)    │
       └──────────────────┘    └──────────────────────┘
                   │
                   ▼
                  curl POST con
                  Bearer ${INTERNAL_API_TOKEN}
```

## Multi-tenancy

Todo va en una única instancia compartida; los tenants se aíslan por la
columna `salon_id` presente en todas las tablas. Row Level Security
(RLS) de Supabase garantiza que un usuario autenticado solo ve filas
de su salón.

## Separación de responsabilidades

| Componente | Responsabilidad |
|---|---|
| **Supabase** | Fuente única de verdad. Datos + Auth. NO llama a APIs externas. |
| **Next.js** | UI (panel, landing, web pública del salón) + toda la lógica server (API, webhooks, orquestación LLM, schedulers internos). |
| **systemd (VPS)** | Reloj de los crons — `curl POST` periódico al endpoint Next.js correspondiente. |
| **Telegram Bot API** | Webhook entrante directo a Next.js (header `X-Telegram-Bot-Api-Secret-Token` valida). |
| **DeepSeek** | LLM con tool calling para el chat de la tienda, Juanita Pro (dueño Telegram) y Royce (landing + admin Telegram). |

**Regla de oro:** Supabase nunca llama a APIs externas directamente.
Las APIs externas se invocan desde endpoints Next.js — o desde el cron
systemd que pega al endpoint correspondiente. Sin orquestador
separado, sin formato propietario de workflows.

## Flujo típico: cliente reserva por la web

1. Cliente abre `gonperstudio.shop/s/[slug]/reservar` o el widget de chat.
2. Si va por chat: `POST /api/public/chat/[slug]` → DeepSeek con tools
   `listar_servicios`, `listar_slots_disponibles`, `reservar_cita_publica`.
3. La tool `reservar_cita_publica` hace INSERT en `citas` con bloqueo
   anti-race (CTE + FOR UPDATE SKIP LOCKED).
4. Tras INSERT, `notificarDuenoNuevaCita` manda Telegram al dueño con
   los datos de la cita (best-effort).
5. Email de confirmación al cliente vía Resend.

**2 h antes de la cita:**
6. `systemd timer` dispara cada 5 min → `POST /api/v1/cron/recordatorios`.
7. Endpoint marca citas elegibles atómicamente (FOR UPDATE SKIP LOCKED).
8. Para cada cita marcada, manda Telegram al dueño con botón inline
   "📱 Recordar por WhatsApp" que abre `wa.me/<tel>?text=...`.

## Idempotencia y concurrencia

Sin un sistema de retries externo (n8n los hacía), nos apoyamos en
idempotencia a nivel DB:

- **Cron recordatorios**: el UPDATE atómico con CTE + FOR UPDATE SKIP
  LOCKED garantiza que cada cita se marca como "recordatorio enviado"
  una sola vez, aunque el cron se dispare dos veces solapadas.
- **Cron trial-recordatorios**: UNIQUE constraint sobre
  `(salon_id, tipo)` en `trial_avisos_enviados` — si intentas
  insertar dos veces, el segundo falla y saltamos sin enviar email.
- **Reservas**: el INSERT en `citas` valida slot libre dentro de la
  misma transacción.
- **Telegram entrante**: el endpoint webhook valida el `secret_token` y
  responde 200 siempre que sea válido — Telegram no reintenta.

## Costes operativos estimados

Por salón activo:
- Infra fija prorrateada (VPS Dokploy + Supabase EU): ~0,80 €/mes
- DeepSeek (~2.000 llamadas/mes): <0,40 €/mes
- Total variable: <1,20 €/mes

Margen sobre plan Solo/Studio (~30 €): ~28,80 €/salón.

## Decisiones arquitectónicas tomadas

| Decisión | Por qué |
|---|---|
| Apagar n8n y mover orquestación a Next.js | Deploy atómico (1 release = código + lógica), logs en Sentry/journalctl, sin VPS extra, sin formato propietario de workflows. |
| systemd timers para crons | Mismo host que la app (latencia 0), sin dependencia externa, 5 min exactos garantizados, logs nativos en journalctl. |
| Webhook Telegram con `secret_token` por bot | Cada salón guarda su propio secret en `salones.telegram_webhook_secret`. Endpoint `/api/telegram/[bot_username]` valida el header `X-Telegram-Bot-Api-Secret-Token` en tiempo constante. |
| Tools ejecutadas inline (no HTTP a `/api/v1/admin/tool` desde el propio servidor) | Latencia + un punto extra de fallo. El dispatcher HTTP sigue vivo para debugging y reusable desde el panel web. |
| Multi-tenant compartido | Escalabilidad y coste. RLS aísla los datos. |
| Telegram primero, WhatsApp después | Telegram no requiere verificación Meta, lanzamos antes. WhatsApp por Twilio cuando el LTV lo justifique. |
| Sin llamadas de voz, sin TPV, sin nóminas en v1 | Scope creep — Gonper es reservas + agente, no ERP. |
