# Gomper

SaaS de asistentes virtuales personalizables para salones (barberías, peluquerías, manicura, estética).

## Documentación

Toda la documentación del proyecto está en `docs/`:

| Archivo | Contenido |
|---|---|
| `docs/01-vision.md` | Visión del producto, cliente objetivo, modelo de negocio |
| `docs/02-arquitectura.md` | Stack técnico, multi-tenancy, flujos |
| `docs/03-schema.sql` | Schema completo de PostgreSQL/Supabase |
| `docs/04-personaje.md` | Personalidad del agente, prompts, ejemplos |
| `docs/05-mockup-panel.tsx` | Referencia visual del panel del dueño |
| `docs/06-roadmap.md` | Roadmap de construcción por fases |

## Cómo empezar

1. Inicializar git:
   ```bash
   cd gomper
   git init
   git add docs/ README.md
   git commit -m "docs: initial project documentation"
   ```

2. Lanzar Claude Code con este prompt inicial:

   > "Lee todos los archivos de `docs/` con atención. Vas a ayudarme a construir
   > Gomper, una SaaS de agentes IA para salones. Empezamos por la Fase 0 del
   > roadmap (`docs/06-roadmap.md`). Antes de generar nada, dime qué pasos vas
   > a ejecutar y en qué orden, para que los apruebe."

## Stack

Next.js 16 · TypeScript · Tailwind 4 · shadcn/ui · Supabase · Drizzle · DeepSeek V3 · Stripe · Dokploy en VPS · systemd timers
