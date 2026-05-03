# Gomper · Estado y piezas pendientes

> **Última actualización:** 2026-05-03 (sesión cerrada con plataforma operativa al 100%).

---

## ✅ Lo que está hecho y operativo en producción

### Frontend
- [x] Landing pública responsive (`gestori.es`) con CTA "Empezar prueba gratis 7 días"
- [x] Web pública de cada salón (`gestori.es/s/<slug>`) con chat IA, calendario reservas, galería, promociones, reseñas
- [x] Login + Signup restilados con paleta cream
- [x] Panel del dueño (`/panel/*`) con Hoy, Agenda, Citas, Conversaciones, Clientes, Servicios, Stats
- [x] Configuración: Datos del salón, Agente, Bot Telegram (auto-setWebhook), Equipo, Horario, Cierres, Suscripción
- [x] Chat Juanita Pro embebido en `/panel/hoy` con datos reales del salón
- [x] CRUD completo: promociones, galería, reseñas, conversaciones
- [x] Panel super admin separado (`admin.gestori.es`) con dashboard global, salones, usuarios, leads, alta manual

### Backend
- [x] Auth Supabase con sesiones SSR
- [x] Tabla `admin_users` para super admins de plataforma
- [x] Helper `requireSuperAdmin()` y `getCurrentSuperAdmin()`
- [x] TrialBlocker overlay: bloquea panel cuando `plan='trial'` y `trial_until < now()`
- [x] Onboarding signup automático: seeds (3 servicios + 11 horarios + 1 profesional) + email bienvenida (Resend)
- [x] Endpoint `/api/v1/juanita-pro` (auth dueño, proxy a webhook n8n)
- [x] Endpoint `/api/v1/cron/recordatorios` (bearer auth, marca + devuelve recordatorios)
- [x] Endpoint `/api/v1/lookup-bot` (bearer auth, info completa del salón)
- [x] Endpoint `/api/public/chat/[slug]` con DeepSeek real
- [x] Endpoint `/api/stripe/webhook` con verificación de firma + 3 eventos
- [x] Endpoint `/api/cron/email-trial-recordatorio` listo para enviar emails 2 días antes de expirar trial
- [x] Helpers Resend: bienvenida, trial expira, confirmación suscripción
- [x] Wrappers Sentry/PostHog (no-op si vars vacías)

### n8n
- [x] Workflow "Juanita Pro (agente del dueño)" — webhook → DeepSeek + 6 tools Supabase
- [x] Workflow "Recordatorios (cron 5 min)" — anti-no-show con botones Confirmar/Cancelar
- [x] Workflow "Bot Cliente Multi-tenant" — atiende a TODOS los bots de salón con `?slug=<slug>`. Distingue dueño/cliente por chat_id. Vincula con `/start CODIGO`.
- [x] Credencial DeepSeek, Supabase REST, Internal API Token

### Stripe (TEST)
- [x] Producto + precio 30€/mes
- [x] Webhook endpoint con 3 eventos
- [x] Customer Portal configurado
- [x] Suscripción real probada (tarjeta `4242 4242 4242 4242`)
- [x] Webhook actualiza correctamente `salones.plan`, `stripe_customer_id`, `stripe_subscription_id`

### Infraestructura
- [x] Dos repos GitHub separados (gonper + admin.gestori) con autodeploy on push
- [x] Dos apps Dokploy (Fronted + Fronted super admin) con dominios SSL
- [x] Variables de entorno completas en Dokploy

---

## 🟠 Pendientes para producción real

### 1. Pasar Stripe de TEST a LIVE
Cuando captes el primer cliente real:
- Crear webhook endpoint LIVE en https://dashboard.stripe.com/webhooks (URL: `https://gestori.es/api/stripe/webhook`, mismos 3 eventos).
- Sustituir 4 vars en Dokploy:
  - `STRIPE_SECRET_KEY=sk_live_...`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`
  - `STRIPE_WEBHOOK_SECRET=whsec_...` (del webhook LIVE)
  - `STRIPE_PRICE_BASIC=price_1TSEhIDs4xG7QRPIFK4fZRE8` (ya creado en LIVE)
- Redeploy.

### 2. Bot global de fallback (opcional)
Crear `@gomper_bot` en BotFather si quieres que haya un bot de la marca para casos de fallback / soporte. Pero el flujo actual ya funciona sin él (cada salón con su propio bot).

---

## 🟡 Recomendable antes de lanzar al mundo

### 3. Observabilidad
- **Sentry** — crear proyecto en sentry.io, copiar DSN, añadir como `SENTRY_DSN` en Dokploy. Los errores se reportan automáticamente vía `src/lib/observability/sentry.ts`.
- **PostHog** — crear proyecto en eu.posthog.com, copiar key, añadir como `NEXT_PUBLIC_POSTHOG_KEY` en Dokploy. Pageviews y eventos se trackean vía `src/components/posthog-pageview.tsx`.

### 4. Email transaccional verificado
Resend funcionando con `re_PoPZDH9q...`. Si quieres enviar desde `@gestori.es` (en vez del dominio de Resend), hay que verificar el dominio en https://resend.com/domains.

---

## 🟢 Post-lanzamiento

- WhatsApp Cloud API (cuando Meta verifique cuenta business)
- Vista agenda semanal estilo calendar
- Stats avanzadas en panel
- Multi-local (cadenas con varios sitios)
- Bizum para depósitos
- Programa de referidos (1 mes gratis por cliente que traes)
- Modo "incognito" para ver el chat público como cliente sin desloguearse del panel

---

## Tiempos estimados pendientes

| Pieza | Tiempo |
|---|---|
| Pasar Stripe a LIVE | 5 min (yo lo hago vía API si me das `sk_live_`) |
| Sentry + PostHog | 10 min (tú creas proyectos, yo añado las keys) |
| Test E2E completo signup nuevo dueño | 5 min (lo haces tú probando registro) |

**Total para 100% production-ready:** ~20 minutos repartidos en cuando lo necesites.
