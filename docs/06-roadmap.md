# Gomper — Roadmap de construcción

> Orden recomendado para construir Gomper desde cero hasta cliente cero
> (Revolution Barbershop) en producción.
>
> **Estimación:** 8-10 semanas a tiempo parcial intenso.

## Fase 0 — Setup (semana 0, 2-3 días)

- [ ] Comprar dominio `gomper.es` ✅
- [ ] Crear cuenta Supabase, proyecto "gomper-prod"
- [ ] Crear cuenta Vercel, conectar a GitHub
- [ ] Crear cuenta Stripe (verificación tarda 1-3 días, lanzar ya)
- [ ] Crear cuenta Google AI Studio, generar API key Gemini
- [ ] Crear repo `gomper` en GitHub (privado)
- [ ] Estructura inicial Next.js 15 + TypeScript + Tailwind + shadcn/ui
- [ ] Configurar Drizzle ORM apuntando a Supabase
- [ ] Ejecutar `docs/03-schema.sql` en Supabase
- [ ] Crear cliente Supabase (server + browser) con tipos generados
- [ ] Deploy inicial a Vercel: `app.gomper.es` → 404 deliberado, solo verificar pipeline
- [ ] Configurar Sentry y PostHog
- [ ] Configurar variables de entorno (`.env.local` + Vercel env)

## Fase 1 — Auth y panel base (semana 1)

- [ ] Login con Supabase Auth (email + password)
- [ ] Página de signup con creación automática de salón
- [ ] Layout del panel con sidebar (Hoy, Agenda, Clientes, Servicios, Stats, Config)
- [ ] Middleware que protege rutas `/panel/*`
- [ ] Helper `getCurrentSalon()` que obtiene el salón del user autenticado
- [ ] Pantalla "Hoy" replicando el mockup de `docs/05-mockup-panel.tsx`
- [ ] Datos reales: queries Drizzle a `citas` filtradas por hoy

## Fase 2 — CRUD básico desde panel (semana 2)

- [ ] CRUD profesionales (alta/baja/edición)
- [ ] CRUD servicios (nombre, duración, precio)
- [ ] CRUD horario semanal
- [ ] CRUD cierres/vacaciones
- [ ] Listado de clientes con métricas
- [ ] Crear cita manual desde panel (cuando viene un cliente físicamente)

## Fase 3 — Web pública del salón (semana 3)

- [ ] Ruta dinámica `gomper.es/[slug]` (ej: `gomper.es/revolution-bcn`)
- [ ] Página pública del salón: nombre, dirección, servicios, horario
- [ ] Botón "Reservar por Telegram" → enlace al bot
- [ ] Formulario de reserva web alternativo (sin Telegram)
- [ ] Cálculo de slots libres en server (función Drizzle)
- [ ] Crear cita desde web → email confirmación al cliente

## Fase 4 — Bot Telegram (cliente final) (semanas 4-5)

- [ ] Setup BotFather + token guardado en `salones.telegram_bot_token`
- [ ] Workflow n8n: webhook entrante de Telegram
- [ ] Enrutamiento por `bot_id` → consulta `salones` para obtener tenant
- [ ] Comandos: `/start`, `/reservar`, `/miscitas`, `/cancelar`, `/precios`, `/horario`
- [ ] Flujo guiado de reserva con inline keyboards
- [ ] Crear/cancelar citas en Supabase desde n8n (service role)
- [ ] Mensaje confirmación post-reserva
- [ ] Fallback IA con Gemini Flash + system prompt de `docs/04-personaje.md`
- [ ] Rate limiting por `telegram_id`

## Fase 5 — Recordatorios y anti-no-show (semana 6)

- [ ] Workflow n8n cron cada 5 min
- [ ] Query atómica de citas a 1h vista pendientes
- [ ] Mensaje de confirmación con botones Confirmar/Cancelar
- [ ] Manejo de callbacks → UPDATE estado
- [ ] Notificación al dueño si no responde a 30 min
- [ ] Lógica de lista de espera: al cancelar, ofrecer hueco al primero

## Fase 6 — Juanita Pro (asistente del dueño) (semana 7)

- [ ] Bot Telegram secundario por salón (token `telegram_bot_dueno_token`)
- [ ] Vinculación: dueño escanea QR en panel → captura `chat_id`
- [ ] Tools de Gemini: `resumen_dia`, `top_no_shows`, `agenda_manana`, `facturacion_periodo`
- [ ] Notificaciones proactivas: cita sin confirmar, cancelación, no-show
- [ ] Comandos administrativos: cancelar cita, activar depósito a cliente

## Fase 7 — Personalización del agente (semana 7, paralelo)

- [ ] Pantalla `/panel/config/agente`
- [ ] Selector de nombre, género, tono
- [ ] Preview en vivo del saludo según configuración
- [ ] Inyección dinámica del system prompt en n8n
- [ ] Frase de bienvenida custom

## Fase 8 — Pagos y suscripción (semana 8)

- [ ] Integración Stripe Checkout (suscripción)
- [ ] Webhook Stripe → actualizar `salones.plan`
- [ ] Customer Portal de Stripe para gestión
- [ ] Lógica de trial: 14 días gratis, después bloquea panel
- [ ] Email transaccional al subir/bajar de plan

## Fase 9 — Landing pública (semana 9)

- [ ] `gomper.es` → landing
- [ ] Hero + chat interactivo de Juanita (5 turnos)
- [ ] Llamada a Gemini en turno 4 desde API route
- [ ] Captura de leads en tabla `leads`
- [ ] Sección precios, cómo funciona, FAQ
- [ ] CTA → signup

## Fase 10 — Lanzamiento con Revolution (semana 10)

- [ ] Migrar citas existentes de Simply Schedule a Gomper (manual o script)
- [ ] Onboarding presencial con el dueño
- [ ] Modificar web actual de Revolution: botón "Reservar por Telegram"
- [ ] Cartel QR en barbería física
- [ ] Monitorización primera semana
- [ ] Recoger feedback, iterar

## Post-lanzamiento (mes 3+)

- [ ] WhatsApp Cloud API (cuando Meta verifique)
- [ ] Vista agenda semanal (calendario completo)
- [ ] Estadísticas avanzadas en panel
- [ ] Multi-local (cadenas)
- [ ] Bizum nativo para depósitos
- [ ] Programa de referidos: cada cliente que traes, 1 mes gratis

## Reglas de oro durante el desarrollo

1. **No saltar fases.** Cada fase desbloquea la siguiente.
2. **Lo que no esté en el roadmap, no se construye.** Apuntar ideas
   nuevas en `docs/ideas-futuras.md`, no implementar.
3. **Tests para lógica crítica:** cálculo de slots, idempotencia de
   recordatorios, validación de citas no solapadas.
4. **Despliegue continuo:** cada fase termina con merge a main y deploy
   a producción aunque solo lo veas tú.
5. **Revolution prueba desde la fase 3.** Cuanto antes toque el producto,
   antes corriges errores de visión.
