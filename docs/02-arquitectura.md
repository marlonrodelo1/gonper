# Gomper — Arquitectura técnica

## Stack tecnológico

| Capa | Tecnología | Por qué |
|---|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript | SSR, RSC, deploy fácil |
| Estilos | Tailwind CSS + shadcn/ui | Velocidad + consistencia |
| Base de datos | PostgreSQL (Supabase) | RLS multi-tenant gratis |
| ORM | Drizzle | Type-safe, serverless-friendly |
| Auth | Supabase Auth | Email + password, sin liarse |
| Hosting frontend | Vercel | Deploy automático desde Git |
| Hosting n8n | VPS Hetzner (existente) | Self-hosted, control total |
| Mensajería bot | Telegram Bot API | Gratis, multi-tenant simple |
| LLM | Gemini 2.5 Flash | Coste mínimo, buena calidad ES |
| Pagos suscripción | Stripe | Estándar SaaS |
| Pagos depósitos | Stripe (futuro: Bizum) | España nativo después |
| Errores | Sentry | Free tier suficiente |
| Analytics | PostHog | Free tier + feature flags |

## Diagrama general

```
┌──────────────────────────────────────────────────┐
│  CLIENTES FINALES                                │
│  (los que se cortan el pelo)                     │
│                                                  │
│  ↕ Telegram (bot del salón)                      │
│  ↕ Web pública (gomper.es/revolution)            │
└────────┬─────────────────────────┬───────────────┘
         │                         │
         ▼                         ▼
┌──────────────────┐      ┌────────────────────────┐
│  Telegram API    │      │  Next.js (Vercel)      │
│  (multi-bot)     │      │  • app.gomper.es       │
└────────┬─────────┘      │  • gomper.es/[slug]    │
         │                │  • API routes          │
         │                └────────┬───────────────┘
         │                         │
         ▼                         │
┌──────────────────────┐           │
│  n8n (VPS)           │           │
│  • Webhooks Telegram │           │
│  • Cron recordatorio │           │
│  • Lista espera auto │           │
│  • Llamadas a Gemini │           │
└──────────┬───────────┘           │
           │                       │
           └───────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  Supabase            │
            │  • PostgreSQL        │
            │  • Auth              │
            │  • Realtime          │
            │  • Storage (fotos)   │
            └──────────────────────┘
```

## Multi-tenancy

**Todo va en una única instancia compartida**, los tenants se aíslan por
la columna `salon_id` presente en todas las tablas. Row Level Security (RLS)
de Supabase garantiza que un usuario autenticado solo ve filas de su salón.

## Separación de responsabilidades

| Componente | Responsabilidad |
|---|---|
| **Supabase** | Fuente única de verdad. Datos + Auth. NO llama a APIs externas. |
| **Next.js** | UI (panel, landing, web pública del salón). API síncrona. Validaciones al crear citas. |
| **n8n** | Todo lo asíncrono y externo: webhooks, crons, mensajería, LLM. |
| **Gemini** | Solo cuando hace falta lenguaje natural. Resto son flujos guiados con botones. |

**Regla de oro:** Supabase NUNCA llama a APIs externas directamente.
Todo lo que requiera salir de la DB pasa por n8n.

## Flujo típico: cliente reserva por Telegram

1. Cliente escribe a `@revolution_bot` en Telegram
2. Telegram → webhook → n8n
3. n8n consulta servicios/horarios → Supabase
4. n8n responde con botones → Telegram
5. Cliente elige → callback → n8n
6. n8n hace INSERT en `citas` (estado `pendiente`) → Supabase
7. n8n confirma al cliente → Telegram

**1h antes de la cita:**
8. Cron de n8n cada 5 min → busca citas pendientes a 1h vista
9. UPDATE atómico de `recordatorio_enviado_at` → Supabase
10. n8n envía mensaje con botones Confirmar/Cancelar → Telegram
11. Cliente confirma → callback → n8n → UPDATE estado a `confirmada` → Supabase

## Idempotencia y concurrencia

Para evitar enviar el mismo recordatorio dos veces, usamos UPDATE atómico:

```sql
UPDATE citas
SET recordatorio_enviado_at = now()
WHERE id = $1
  AND recordatorio_enviado_at IS NULL
RETURNING *;
```

Si dos workers de n8n procesan la misma fila a la vez, solo uno consigue
filas en el RETURNING. El otro recibe array vacío y no envía nada.

## Costes operativos estimados

Por salón activo:
- Infra fija prorrateada: ~0,70 €/mes
- IA (Gemini Flash, ~1.000 llamadas/mes): <0,50 €/mes
- Total coste variable: <1,20 €/mes

Margen sobre plan Studio (29,90 €): ~28,70 €/salón.

## Decisiones arquitectónicas tomadas

| Decisión | Por qué |
|---|---|
| Multi-tenant compartido (no un n8n por cliente) | Escalabilidad, mantenimiento, coste |
| Telegram primero, WhatsApp después | Telegram no requiere verificación Meta, lanzamos antes |
| Sin llamadas de voz (solo mensajes) | Coste, RGPD, tasa de respuesta inferior |
| Flujo guiado por botones en lugar de chat libre | Coste IA, fiabilidad, accesibilidad usuarios mayores |
| Sin TPV ni gestión de empleados/nóminas en v1 | Scope creep — Gomper es reservas + agente, no ERP |
