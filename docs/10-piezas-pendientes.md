# Gomper · Piezas pendientes hasta producción

> Estado a **2026-05-02**. Tras completar el agente Juanita Pro y el rediseño de auth.

## Accesos de prueba (ya operativos)

### Cuenta dueño
- **URL:** [https://gestori.es/login](https://gestori.es/login)
- **Email:** `demo@gomper.es`
- **Contraseña:** `GomperDemo2026!`
- **Rol:** dueño del "Salón Demo de Marlon"
- Tras login redirige a `/panel/hoy` con datos seed (4 servicios, 2 profesionales, 4 clientes, 7 citas históricas).
- El chat de Juanita Pro funciona tirando del workflow n8n.

### Cuenta super admin (acceso total a la plataforma)
- **URL:** [https://gestori.es/admin](https://gestori.es/admin)
- **Email:** `rodelomarlon1@gmail.com`
- **Contraseña:** `GomperSuperAdmin2026!`
- **Capacidades:**
  - `/admin` — dashboard con KPIs (salones totales, en trial, pagando, leads sin convertir, etc.)
  - `/admin/salones` — listado con filtros (todos/activos/trial/pagando/inactivos) + buscador
  - `/admin/salones/[id]` — detalle: suspender, reactivar, forzar plan básico, cancelar suscripción, borrar
  - `/admin/salones/nuevo` — alta manual de salón + dueño (sin entrar a Supabase)
  - `/admin/usuarios` — todos los registrados, con su salón y rol
  - `/admin/leads` — leads de la landing, con filtro "no convertidos"
- **Tabla en BD:** `admin_users` (usuarios con permisos super admin de la plataforma).

---

## ✅ Lo que ya está hecho

| Pieza | Estado |
|---|---|
| Esquema BD (Supabase, Drizzle) | ✅ |
| Web pública del salón `/[slug]` | ✅ |
| Panel del dueño (Hoy, Agenda, Servicios, Clientes, etc.) | ✅ |
| Chat web del agente (cara cliente) `/api/public/chat/[slug]` | ✅ |
| Conversaciones en panel | ✅ |
| Promociones, galería, reseñas (CRUDs) | ✅ |
| Plan único 30 €/mes (modelo de negocio acordado) | ✅ |
| Trial 7 días al registrarse | ✅ |
| Workflow n8n "Juanita Pro" + tools Supabase | ✅ |
| Endpoint `/api/v1/juanita-pro` + UI conectada | ✅ |
| Auth login/signup restilados (paleta cream) | ✅ |
| Variable `N8N_JUANITA_WEBHOOK_URL` en local + Dokploy | ✅ |

---

## 🔴 Bloqueantes para captar primer cliente real

### Pieza A · Stripe end-to-end
- [ ] Crear producto/precio espejo en Stripe TEST (mismo 30 €/mes).
- [ ] Rellenar 4 vars en `.env.local` y Dokploy:
  - `STRIPE_SECRET_KEY` (sk_test_…)
  - `STRIPE_WEBHOOK_SECRET` (whsec_…)
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_test_…)
  - `STRIPE_PRICE_BASIC` (price_…)
- [ ] Configurar webhook LIVE en Stripe Dashboard apuntando a `https://gestori.es/api/stripe/webhook`.
- [ ] Activar Customer Portal (Settings → Billing → Customer portal).
- [ ] Probar flujo completo con tarjeta `4242 4242 4242 4242`.
- [ ] Bloquear `/panel/*` cuando trial expira y `plan != 'basico'`.

### Pieza B · Super Admin (`/admin/*`) ✅ COMPLETADA
- [x] Migración: tabla `admin_users` creada en Supabase.
- [x] Marcar a `rodelomarlon1@gmail.com` como super_admin.
- [x] Helper `requireSuperAdmin()` y `getCurrentSuperAdmin()` en `src/lib/auth/super-admin.ts`.
- [x] Layout `/admin/layout.tsx` con sidebar separado del panel del dueño.
- [x] `/admin/salones` — lista, buscador, filtros (todos/activos/trial/pagando/inactivos).
- [x] `/admin/salones/[id]` — detalle con plan, dueños, stats; suspender/reactivar/forzar básico/cancelar/borrar.
- [x] `/admin/salones/nuevo` — alta manual: nombre + slug + tipo + email del dueño + password.
- [x] `/admin/usuarios` — listado de auth.users con su salón, búsqueda por email.
- [x] `/admin/leads` — leads de la landing con filtro "no convertidos" + paginación.
- [ ] Acción "Iniciar sesión como" para soporte (impersonate). *Pendiente — opcional.*

### Pieza C · Onboarding self-service desde landing
- [ ] CTA "Empezar prueba gratuita 7 días" en landing → `/signup`.
- [ ] Pulir flow `signup` actual (validaciones, email confirmation, slug único).
- [ ] Email transaccional de bienvenida (vía SMTP de Supabase o Resend).
- [ ] Crear servicios/profesionales/horarios por defecto al registrarse — para que el panel no aparezca vacío.

### Pieza D · Bot Telegram global de Gomper
- [ ] Crear `@gomper_bot` (o el nombre que decidas) en BotFather.
- [ ] Añadir trigger Telegram al workflow Juanita Pro (mismo agente, distinto canal).
- [ ] Lookup del salón por `telegram_chat_id_dueno` en tabla `salones`.
- [ ] UI en panel (`/panel/config/notificaciones`) para que el dueño "vincule" su Telegram escaneando un QR — el bot captura el `chat_id` al primer mensaje.

---

## 🟠 Necesarios antes de captar volumen

### Pieza E · Bot Telegram clientes finales (multi-tenant)
- [ ] Importar workflow `docs/n8n-workflow-bot-cliente.json` (cliente final reserva por Telegram).
- [ ] Sistema de provisión: cada salón conecta su propio bot Telegram → guardar `telegram_bot_token` en `salones`.
- [ ] El workflow hace lookup del salón por slug en la URL `/gomper-bot/:slug`.

### Pieza F · Recordatorios automáticos (cron)
- [ ] Importar workflow `docs/n8n-workflow-recordatorios.json` (cron 5 min).
- [ ] Generar `INTERNAL_API_TOKEN` (48 chars random) en local + Dokploy + n8n.
- [ ] Validar que `/api/v1/cron/recordatorios` devuelve citas a 1h vista.
- [ ] Mensaje de confirmación con botones (callbackQuery).

### Pieza G · Gemini API (fallback IA en chat público)
- [ ] Generar `GOOGLE_GENERATIVE_AI_API_KEY` en Google AI Studio.
- [ ] Sustituir mock de `/api/public/chat/[slug]` por llamada real a Gemini.
- [ ] Prompt según `agente_nombre`/`agente_tono`/`agente_genero` del salón.
- [ ] Rate limiting agresivo por `session_id`.

---

## 🟡 Recomendable antes de lanzar

### Pieza H · Observabilidad
- [ ] `SENTRY_DSN` configurado (errores en tiempo real).
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` configurado (conversión trial → pago, embudo onboarding).
- [ ] Dashboard básico con KPIs: signups/día, conversión, churn, MRR.

### Pieza I · Emails transaccionales
- [ ] Email confirmación tras signup.
- [ ] Email recordatorio "tu trial acaba en 2 días".
- [ ] Email post-suscripción con bienvenida + guía rápida.
- [ ] Email cuando el dueño tiene 0 servicios después de 24h (guía de setup).

---

## 🟢 Mejoras post-lanzamiento

- [ ] WhatsApp Cloud API (cuando Meta verifique).
- [ ] Vista agenda semanal completa (tipo calendar).
- [ ] Estadísticas avanzadas en `/panel/stats`.
- [ ] Multi-local (cadenas con varios sitios).
- [ ] Bizum para depósitos.
- [ ] Programa de referidos (1 mes gratis por cada cliente que traes).

---

## Variables de entorno completas (referencia)

| Variable | Ámbito | Valor / origen |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | local + Dokploy | ✅ ya está |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | local + Dokploy | ✅ ya está |
| `DATABASE_URL` | local + Dokploy | ✅ ya está |
| `SUPABASE_SERVICE_ROLE_KEY` | local + Dokploy | ✅ ya está |
| `N8N_JUANITA_WEBHOOK_URL` | local + Dokploy | ✅ ya está |
| `INTERNAL_API_TOKEN` | local + Dokploy + n8n | ❌ **falta** — generar con PowerShell `-join ((48..57)+(65..90)+(97..122) \| Get-Random -Count 48 \| % {[char]$_})` |
| `STRIPE_SECRET_KEY` | local + Dokploy | ❌ **falta** — Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | local + Dokploy | ❌ **falta** — Stripe Webhooks |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | local + Dokploy | ❌ **falta** — Stripe Dashboard |
| `STRIPE_PRICE_BASIC` | local + Dokploy | ❌ **falta** — Stripe → Producto |
| `GOOGLE_GENERATIVE_AI_API_KEY` | local + Dokploy | ❌ **falta** — AI Studio |
| `SENTRY_DSN` | Dokploy | ⚠️ recomendable |
| `NEXT_PUBLIC_POSTHOG_KEY` | local + Dokploy | ⚠️ recomendable |

---

## Orden sugerido de ataque

1. **Pieza B (super admin)** — desbloquea gestión sin entrar a Supabase. Próxima sesión.
2. **Pieza A (Stripe)** — necesario para cobrar. Tú generas claves, yo conecto.
3. **Pieza C (signup landing)** — desbloquea registro self-service.
4. **Pieza D (bot Telegram global)** — cuando me pases el token de BotFather.
5. **Pieza F (cron recordatorios)** — el valor real del producto, anti no-show.
6. **Pieza G (Gemini)** — chat público con IA real.
7. **Piezas E + H + I** — al cerrar primer cliente real.
