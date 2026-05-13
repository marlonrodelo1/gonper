# Marketplace público `/marketplace` — brief de diseño

## Contexto del producto

**Gonper Studio (gonperstudio.shop)** es un SaaS para dueños de salones (peluquería, barbería, estética, manicura) en España. Cada salón tiene su web pública en `/s/[slug]` con sus servicios, fotos, equipo y un chat embebido para reservar (ver ejemplo: una barbería real ya en producción tiene esa estructura).

Lo que se diseña aquí: el **Marketplace público** en `/marketplace`. Es el punto de descubrimiento donde una visitante busca un salón cerca y aterriza en su tienda `/s/[slug]`. Sin login (cero fricción).

NO se diseña aquí:
- El widget de Royce (ya implementado, copia exacta del widget que ya tienen los salones — puedes verlo flotante en la esquina inferior derecha de cualquier `/s/[slug]`).
- El super-admin: ya existe en `admin.gonperstudio.shop` (otro proyecto, marca "Gomper") — no hay que diseñarlo aquí.

## Identidad visual

Misma paleta que la landing actual de Gonper Studio (cream/ink/stone/terracotta/sage), tipografía serif para titulares + sans para cuerpo, estética editorial cálida.

Colores acento por categoría (ya en uso en `/s/[slug]`, respetar):
- **Manicura** → rosa polvo `#D88EA0` / soft `#F3DEE3`.
- **Barbería** → terracotta `#C5562C` / soft `#F1D9CC`.
- **Peluquería** → mostaza tostada `#C58E2C` / soft `#F2E4C7`.
- **Estética** → sage `#8B9D7A` / soft `#DDE3D3`.
- **Otro** → neutro stone.

## Pantallas

### M.1 — Hero del marketplace

- Titular único, serif grande, color ink: ej. *"Encuentra tu próximo salón."*
- Subtítulo en stone: *"Belleza, barbería, manicura y estética en toda España."*
- Buscador grande centrado: input con placeholder *"¿Qué buscas?"* + chip de ubicación a la derecha (geolocalización opcional, no bloqueante).
- Bajo el buscador: chips de categorías rápidas (peluquería · barbería · estética · manicura · otro) con conteo entre paréntesis (ej. "Peluquería (23)").
- Sin imagen de hero pesada. Mucho aire.

### M.2 — Layout listado

- **Desktop**: sidebar 280px a la izquierda con filtros sticky + grid de cards 2-3 columnas según ancho.
- **Mobile**: filtros en bottom-sheet que se abre con un botón flotante "Filtros · 2" (badge con conteo aplicados).
- Header sticky simplificado al hacer scroll: solo logo Gonper Studio + buscador comprimido + botón "Filtros".

### M.3 — Filtros

- **Categoría** (radio o multi-select de 5 opciones).
- **Ciudad** (combo con búsqueda; pre-cargado con las ciudades que tienen al menos 1 salón).
- **Q** (búsqueda libre por nombre — el input separado del hero).
- Botón "Limpiar filtros" cuando hay alguno aplicado.
- Cada filtro al cambiar refresca el grid sin reload completo (Server Actions o `useTransition`).

### M.4 — Card de salón (LO MÁS IMPORTANTE)

Composición:

- **Banner** del salón arriba (16:9 o 5:3), del campo `bannerUrl`. Si no hay, fondo de color suave de la categoría.
- **Logo circular** del salón solapando el banner (estilo profile-picture, 56-64px).
- **Nombre** del salón (serif, ink, 18px).
- **Chip de categoría** con color de la categoría (de la paleta arriba).
- **Ciudad** en stone, pequeña, debajo del nombre.
- 1 línea de `descripcion_corta` (160 chars máx) en stone.
- **Footer de la card**: rating con estrella (sage) + "(N reseñas)" en stone, alineado a un CTA pill terracotta "Ver salón →".
- **Hover**: micro-lift + sombra cálida. NO scaling.
- La card entera es clicable, navega a `/s/[slug]`.

Diseña 3 variantes con datos distintos para validar densidad visual:
1. Banner real + logo real + reseñas (el caso típico).
2. Sin banner (solo logo grande sobre fondo de color de categoría).
3. Logo placeholder (inicial sobre fondo de color).

### M.5 — Estado vacío

Cuando los filtros no devuelven nada: ilustración minimal (línea, no undraw) + texto *"No hay salones que cumplan estos filtros"* + botón "Limpiar filtros".

### M.6 — Royce embebido (NO diseñar, ya existe)

El widget de Royce flota en la esquina inferior derecha (igual que en la landing y en `/s/[slug]`). Es el mismo componente, ya implementado. Solo asegúrate en el diseño de **dejar margen visual** en la esquina inferior derecha del grid mobile para que el botón flotante no tape la última card (típicamente 80px de padding inferior en mobile).

## SEO / cabecera del marketplace

- Título dinámico: *"Peluquerías en Tenerife · Gonper Studio"*.
- Cards con `<a href="/s/[slug]">` reales (no JS-only) para que sean indexables.

## Restricciones técnicas

- Next.js 16 App Router (Server Components por defecto, "use client" solo donde haga falta interactividad).
- Tailwind 4 + shadcn/ui (Card, Badge, Input, Sheet, Select, Button, Avatar). Sin framer-motion.
- Mobile-first.
- Modo claro por defecto. Dark mode opcional pero no prioritario.

## Lo que NO quiero

- Mapa con pins en v1 (queda fuera de scope).
- Login para visitar. Reserva sigue sin login.
- Pop-up de cookies-newsletter recargado al entrar.
- Sliders horizontales de "destacados" en v1. Solo grid filtrable.
- Aesthetic genérica de "AI SaaS" (gradientes morados, blobs, estrellas).
- Ilustraciones tipo undraw.co.
- Más de 2 fuentes distintas.
- Iconografía mezclada (mantener Lucide).
