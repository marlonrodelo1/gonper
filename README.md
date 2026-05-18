# Gomper

SaaS de asistentes virtuales personalizables para salones (barberías, peluquerías, manicura, estética). Atiende reservas 24/7 por Telegram (luego WhatsApp), confirma citas, elimina no-shows.

## Stack

Next.js 16 · TypeScript · Tailwind 4 · shadcn/ui · Supabase (Auth + Postgres) · Drizzle ORM · DeepSeek V3 · Stripe · Dokploy en VPS · systemd timers

## Documentación

Toda la documentación de producto y arquitectura está en [`docs/`](./docs/):

| Archivo | Contenido |
|---|---|
| [`docs/01-vision.md`](./docs/01-vision.md) | Visión, cliente objetivo, modelo de negocio |
| [`docs/02-arquitectura.md`](./docs/02-arquitectura.md) | Stack, multi-tenancy, flujos |
| [`docs/03-schema.sql`](./docs/03-schema.sql) | Schema completo PostgreSQL/Supabase |
| [`docs/04-personaje.md`](./docs/04-personaje.md) | Personalidad del agente, prompts, ejemplos |
| [`docs/05-mockup-panel.tsx`](./docs/05-mockup-panel.tsx) | Referencia visual del panel |
| [`docs/06-roadmap.md`](./docs/06-roadmap.md) | Roadmap de construcción por fases |

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # rellena con tus credenciales reales
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Variables de entorno

Mira [`.env.example`](./.env.example). Necesitas:

- **Supabase**: URL del proyecto, anon key, service role key, `DATABASE_URL` (para Drizzle)
- **DeepSeek**: `DEEPSEEK_API_KEY` (chat de tienda + Juanita Pro Telegram + Royce)
- **Gemini** (opcional): `GOOGLE_GENERATIVE_AI_API_KEY`
- **Stripe**: claves publicable + secreta + webhook
- **Telegram bots**: el bot del salón se configura por tenant desde `/panel/config/bot`. El bot interno de Royce (`@Royrogo_bot`) usa `ROYCE_TELEGRAM_BOT_TOKEN` + `ROYCE_TELEGRAM_WEBHOOK_SECRET` + `ROYCE_ALLOWED_CHAT_IDS`
- **Crons**: `INTERNAL_API_TOKEN` (compartido con los systemd timers — ver [`infra/systemd/README.md`](./infra/systemd/README.md))

### Aplicar el schema a Supabase

El schema vive en `docs/03-schema.sql`. Ejecútalo en el SQL editor de Supabase la primera vez. Las próximas migraciones se gestionan con Drizzle:

```bash
npx drizzle-kit generate   # genera migración desde src/lib/db/schema.ts
npx drizzle-kit migrate    # aplica al DATABASE_URL configurado
```

## Estructura

```
src/
  app/
    page.tsx              landing pública (hero + cómo funciona + planes)
    (auth)/               login + signup
    auth/                 callbacks/handlers de Supabase Auth
    s/[slug]/             web pública del salón (perfil reservable)
    panel/                dashboard del dueño
      layout.tsx          sidebar + auth + link a web pública
      hoy/                agenda del día con datos reales
      agenda/             agenda semanal
      citas/              gestión de citas
      clientes/           listado + detalle [id]
      servicios/          listado + nuevo + detalle [id]
      stats/              métricas
      config/             ajustes (perfil, equipo, agente, layout compartido)
    api/v1/               API REST interna (crons + tools dispatcher, antes consumida por n8n)
    api/telegram/         webhooks Telegram (bot del salón + bot Royce)
  components/ui/          shadcn/ui (button, card, dialog, table, tabs, ...)
  lib/
    db/                   Drizzle schema + cliente
    supabase/             clientes server/browser + helpers (getCurrentSalon)
    utils.ts              cn() helper de shadcn
  proxy.ts                Next.js 16 proxy — refresh sesión + protección /panel/*
docs/                     documentación de producto
```

## Roadmap

Ver [`docs/06-roadmap.md`](./docs/06-roadmap.md). Estado actual: **producción**. Migración n8n → Next.js completada en 2026-05-19 (crons via systemd, webhooks Telegram directos, Royce y Juanita Pro orquestados in-process).
