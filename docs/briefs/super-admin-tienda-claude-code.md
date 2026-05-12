# Brief Claude Code — Super-admin tienda (repo `admin.gestori.es`)

Este prompt va al repo separado de super-admin (no aquí). Llévalo a Claude Code apuntando al repo `admin.gestori.es` y péguelo en una conversación nueva. El brief asume que el repo base ya existe con auth Supabase + `requireSuperAdmin()` (si no, lo pides primero).

---

# Pegar a Claude Code dentro de `admin.gestori.es`

## Contexto del proyecto

Este repo es **`admin.gestori.es`**, el super-admin del SaaS Gestori (panel para que Marlon, dueño de Rogotech, gestione marcas, productos y destacados del marketplace que se sirven al repo principal `gestori.es`).

- Stack: Next.js 16 App Router + TypeScript estricto + Tailwind 4 + shadcn/ui.
- Auth: Supabase Auth (SSR cookies) + `requireSuperAdmin()` que verifica fila en tabla `admin_users` (proyecto Supabase `gomper-prod`).
- **Marca visual de este panel**: "Gomper" (la versión interna), no "Gestori". Mantener consistencia con lo que ya haya en el repo.
- Backend: todos los datos se leen y mutan vía endpoints del repo principal `gestori.es/api/v1/admin/*` con header `Authorization: Bearer ${process.env.INTERNAL_API_TOKEN}`. **No accedes a la BD directamente desde este repo** (salvo subida de imágenes a Supabase Storage).
- Env vars necesarias en Dokploy del servicio "Fronted super admin":
  - `INTERNAL_API_TOKEN` (compartido con `gestori.es`).
  - `NEXT_PUBLIC_GESTORI_API_BASE_URL=https://gestori.es` (o la URL del repo principal).
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (para subir imágenes al bucket `salon-assets`).

## Restricciones

- TypeScript estricto, sin `any`. Validación Zod en todos los formularios.
- shadcn/ui antes que custom CSS. Mobile-friendly (el panel se usará desde móvil para gestionar marcas urgentes).
- Spanish en TODO lo visible al usuario; inglés en variables/funciones técnicas.
- Paleta visual Gestori (variables CSS): cream (`#F5EFE7`), ink (`#2B2823`), terracotta (`#B14848`), sage (`#8B9D7A`). Si el repo ya tiene globals.css con estas vars, reusarlas; si no, definirlas.
- Server components por defecto, `'use client'` solo donde haga falta interactividad.
- **NO duplicar lógica de validación**: si el endpoint del backend ya valida (con Zod), aquí solo replicas a nivel de UX. La fuente de verdad son los errores que devuelva la API.

## Pantallas a construir (todas bajo `/admin/*`)

Cada pantalla debe usar el layout común (sidebar + topbar) y el helper `requireSuperAdmin()` en el server component raíz.

### 1. `/admin/marcas` — gestión de marcas

**Listado** (tabla):
- Columnas: logo (preview 32x32), nombre, slug, comisión%, mínimo B2B (€), activa (badge), creada.
- Búsqueda por nombre/slug (input local, filtra client-side).
- Botón "Nueva marca" arriba a la derecha → modal/drawer con form.
- Fila clickable → `/admin/marcas/[id]`.

**Endpoint**: `GET /api/v1/admin/marcas` → `{ marcas: Marca[] }`.

**Detalle `/admin/marcas/[id]`**:
- Sección "Datos de la marca" con form editable:
  - nombre*, slug (readonly tras crear), descripción, logo URL (con preview), web URL, contacto email, contacto teléfono, comisión%, mínimo B2B €, activa (switch).
- Sección "Categorías de la marca" (CRUD inline):
  - Tabla con orden drag-drop, nombre editable inline, switch activa, botón borrar.
  - Botón "Añadir categoría" → fila nueva con campos `slug` + `nombre`.
- Sección "Productos de esta marca" (read-only, conteo + link a `/admin/productos?marca_id=<id>`).
- Botón "Desactivar marca" (DELETE soft) abajo, con confirmación.

**Endpoints**:
- `GET /api/v1/admin/marcas/[id]`
- `PATCH /api/v1/admin/marcas/[id]`
- `DELETE /api/v1/admin/marcas/[id]` (soft)
- `GET /api/v1/admin/marcas/[id]/categorias?include_inactivas=1`
- `POST /api/v1/admin/marcas/[id]/categorias` { slug, nombre, orden? }
- `PATCH /api/v1/admin/categorias-marca/[id]` { nombre?, orden?, activa? }
- `DELETE /api/v1/admin/categorias-marca/[id]` (soft)

**Form crear marca**: mismo shape que detalle. Endpoint `POST /api/v1/admin/marcas`. Validación cliente con Zod replicando los límites del backend.

### 2. `/admin/productos` — gestión de productos

**Listado** (tabla):
- Filtros (chips o select arriba): marca (dropdown), categoría global (enum 6 valores), `tipo_distribucion` (stock/dropshipping), activo (sí/no).
- Columnas: imagen (preview 40x40), nombre, marca, categoría global, categoría propia de marca (si tiene), precio mayorista (lo que paga el salón a Gestori), **coste mayorista** (lo que paga Gestori a la marca, marcado como *interno*), PVP recomendado, `tipo_distribucion` (badge), activo (badge).
- Búsqueda local por nombre.
- Botón "Nuevo producto" → `/admin/productos/nuevo`.
- Botón "Importar CSV" → `/admin/productos/bulk`.
- Fila clickable → `/admin/productos/[id]`.

**Endpoint**: `GET /api/v1/admin/productos?marca_id=&categoria=&tipo_distribucion=` → `{ productos: ProductoConJoin[] }`. La respuesta incluye `marcaNombre`, `categoriaMarcaSlug`, `categoriaMarcaNombre` ya joineados.

**Detalle/Form `/admin/productos/[id]` y `/admin/productos/nuevo`**:
- Campos del form (mismo shape para crear/editar):
  - **`marca_id`** (select de marcas activas; readonly al editar).
  - **`slug`** (autosugerido desde nombre, validar `[a-z0-9-]+`).
  - `sku?`.
  - **`nombre`**.
  - `descripcion?` (textarea).
  - **`categoria`** global (select de 6 valores: capilar/barba/unas/estetica/accesorio/otro).
  - `categoria_marca_id?` (select dependiente: poblar con `/api/v1/admin/marcas/[marca_id]/categorias` cuando se elige marca; opción "Ninguna").
  - `tipo_distribucion` (radio: 'stock' default | 'dropshipping' — incluir tooltip explicando que dropshipping todavía NO cambia comportamiento, es preparación Wella).
  - `tipo_negocio_target?` (multi-select chips: peluqueria/barberia/estetica/manicura/otro).
  - **`imagenes`** array de URLs (componente uploader, ver abajo).
  - `coste_mayorista_eur?` (label: "Coste a marca (interno)", color stone).
  - **`precio_mayorista_eur`** (label: "Precio al salón").
  - **`precio_publico_recomendado_eur`** (label: "PVP recomendado al cliente final").
  - `unidad_medida` (default "unidad").
  - `peso_g?`, `stock_disponible_marca?`.
  - `activo` (switch).
- Cálculo automático visible en la UI (no se guarda, solo informativo):
  - Margen Gestori B2B = `precio_mayorista_eur - coste_mayorista_eur` (cuando ambos están).
  - Margen salón sobre PVP recomendado = `precio_publico_recomendado_eur - precio_mayorista_eur`.

**Endpoints**:
- `POST /api/v1/admin/productos`
- `GET /api/v1/admin/productos/[id]`
- `PATCH /api/v1/admin/productos/[id]`
- `DELETE /api/v1/admin/productos/[id]` (soft)

### 3. `/admin/productos/bulk` — carga masiva por CSV

**Flujo**:
1. Selector arriba: **Marca destino** (todos los productos del CSV irán a esta marca).
2. Drop-zone para `.csv` (1 archivo). Acepta arrastrar o click para elegir.
3. Parsing cliente con `papaparse` (instalar). Mostrar errores de parse si los hay.
4. Preview tabular del CSV parseado (primeras 50 filas + total). Permitir cancelar.
5. Botón "Crear N productos" → llama a `POST /api/v1/admin/productos/bulk` con `{ marca_id, productos: [...] }`.
6. Manejo de errores específicos del endpoint:
   - `slugs_duplicados_en_csv` → mostrar los slugs problemáticos.
   - `slugs_ya_existen_en_marca` → idem.
   - `categorias_marca_invalidas` → idem.
   - 200 → toast "X productos creados" + redirect a `/admin/productos?marca_id=<id>`.

**Columnas esperadas del CSV** (encabezado obligatorio, orden flexible):

| Columna | Tipo | Obligatoria | Notas |
|---|---|---|---|
| `slug` | string `[a-z0-9-]+` | sí | Único por marca |
| `sku` | string | no | |
| `nombre` | string | sí | |
| `descripcion` | string | no | |
| `categoria` | enum global | sí | capilar/barba/unas/estetica/accesorio/otro |
| `categoria_marca_slug` | string | no | Slug de la categoría propia de marca. Cliente lo resuelve a `categoria_marca_id` antes de enviar. |
| `tipo_distribucion` | enum | no | stock (default) / dropshipping |
| `tipo_negocio_target` | string | no | Tipos separados por `|` (ej: `peluqueria\|barberia`) |
| `imagenes` | string | no | URLs separadas por `|` |
| `coste_mayorista_eur` | número | no | Interno |
| `precio_mayorista_eur` | número | sí | |
| `precio_publico_recomendado_eur` | número | sí | |
| `unidad_medida` | string | no | default "unidad" |
| `peso_g` | número entero | no | |
| `stock_disponible_marca` | número entero | no | |
| `activo` | bool | no | true/false (default true) |

**Resolución `categoria_marca_slug` → `categoria_marca_id`**:
- Al cargar la pantalla, fetch a `GET /api/v1/admin/marcas/[marca_id]/categorias` y construir mapa `{ slug → id }`.
- Para cada fila del CSV: si `categoria_marca_slug` no está en el mapa → marcar fila inválida con mensaje "categoría no existe en marca".
- Sin filas inválidas → enviar bulk.

**Plantilla CSV descargable**: botón "Descargar plantilla" arriba que genere un `.csv` con solo la fila de encabezados.

### 4. `/admin/destacados` — gestión salones destacados marketplace

**Listado**:
- Filtros: ciudad, tipo_negocio.
- Tabla: nombre del salón, ciudad, tipo_negocio, switch destacado, input numérico orden (deshabilitado si no destacado), badge "sin coordenadas" si `tieneCoordenadas: false` (avisar que no aparecerá geolocalizado).
- Cambios optimistas: switch o orden → PATCH inmediato. Revertir si la API falla.

**Endpoints**:
- `GET /api/v1/admin/destacados?only=destacados` (toggle filtro "solo destacados").
- `PATCH /api/v1/admin/destacados` { salon_id, destacado, orden? }.

### 5. `/admin/pedidos-b2b` — pedidos B2B (salones piden a marcas)

**Listado**:
- Filtros: estado (chips: pendiente/aceptado/enviado/entregado/cancelado), marca, salón.
- Tabla: número, fecha, salón (nombre + email), marca, total €, estado (badge color por estado), botón "Ver".
- Detalle modal o drawer: items del pedido (nombre snapshot, cantidad, subtotal), notas del salón, notas de la marca (editables), dropdown para cambiar estado.

**Endpoints**:
- `GET /api/v1/admin/pedidos-b2b?estado=&marca_id=&salon_id=`
- `PATCH /api/v1/admin/pedidos-b2b/[id]/estado` { estado }

**Importante**: cuando se marca `entregado`, el backend automáticamente rellena `stock_salon` (no hay que hacer nada extra desde el super-admin). Mostrar toast "Stock actualizado para el salón" al volver con éxito.

### 6. (Opcional, NO bloqueante) `/admin/ventas-b2c` — auditoría

Solo si te queda tiempo. Hoy el repo principal solo expone `GET /api/v1/admin/ventas-b2c/[id]` (detalle). Si lo quieres listado, primero hay que añadir `GET /api/v1/admin/ventas-b2c` en el repo principal — saltar esta pantalla en este sprint.

## Subida de imágenes (transversal a productos)

Para no pasar archivos por el backend del repo principal, sube **directamente desde el cliente** del super-admin a Supabase Storage:

```ts
// src/lib/storage/upload-producto-imagen.ts (este repo)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,  // server-only
  { auth: { persistSession: false } },
);

export async function subirImagenProducto({
  marcaSlug,
  productoSlug,
  file,
}: { marcaSlug: string; productoSlug: string; file: File }): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `productos/${marcaSlug}/${productoSlug}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('salon-assets')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('salon-assets').getPublicUrl(path);
  return data.publicUrl;
}
```

Ese helper se llama desde un server action o ruta API del propio super-admin (NO desde el cliente del navegador con service_role). El componente uploader del form usa fetch a una ruta interna que llama a este helper.

## Helpers que probablemente quieras crear

```ts
// src/lib/api/gestori.ts — cliente para el backend del repo principal
const BASE = process.env.NEXT_PUBLIC_GESTORI_API_BASE_URL!;
const TOKEN = process.env.INTERNAL_API_TOKEN!;

export async function gestoriFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${TOKEN}`);
  if (init?.json) headers.set('Content-Type', 'application/json');

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    body: init?.json ? JSON.stringify(init.json) : init?.body,
    cache: 'no-store',
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new GestoriApiError(res.status, errBody);
  }
  return res.json() as Promise<T>;
}

export class GestoriApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`Gestori API ${status}`);
  }
}
```

## Orden de implementación sugerido

1. Layout base + auth `requireSuperAdmin()` + sidebar con 5 entradas.
2. Helper `gestoriFetch` + tipos compartidos.
3. `/admin/marcas` (listado + crear + editar).
4. `/admin/marcas/[id]` categorías (subsección).
5. `/admin/productos` listado + form individual.
6. `/admin/productos/bulk` (CSV con papaparse).
7. `/admin/destacados`.
8. `/admin/pedidos-b2b`.
9. Smoke test end-to-end (ver más abajo).

## Smoke test end-to-end

Una vez todo construido y desplegado en `admin.gestori.es`:

1. Login con `rodelomarlon1@gmail.com` (super-admin verificado en `admin_users`).
2. Crear marca "Wella Demo" con logo URL real.
3. Crear 2 categorías de marca: "Champús", "Mascarillas".
4. Crear 1 producto en "Mascarillas" desde el form individual.
5. Descargar plantilla CSV, llenar con 3 productos en "Champús", subir.
6. Verificar `/admin/productos?marca_id=<id>` muestra los 4.
7. Ir al panel del salón en `gestori.es/panel/catalogo` con un usuario salón existente → los 4 productos aparecen.
8. Hacer pedido B2B desde el salón.
9. Volver a `admin.gestori.es/admin/pedidos-b2b` → marcar como `entregado`.
10. Volver al salón `/panel/stock` → confirmar stock recibido.
11. En `admin.gestori.es/admin/destacados` → marcar 2 salones como destacados con orden 1 y 2.
12. Verificar `gestori.es/marketplace` los muestra (cache 60s).

Si los 12 pasos pasan → super-admin operativo en producción.

## Lo que NO entra en este sprint

- Modelo Wella dropshipping completo (flujo de dinero, reparto Connect, factura al cliente, integración API Wella, tramitación pedidos). Tiene 4 dudas legales/operativas pendientes; mover a sesión nueva.
- `/admin/ventas-b2c` listado global.
- Editor visual de PVP por margen (sugerencias automáticas).
- Estadísticas/dashboards.
- Notificaciones push/email al super-admin cuando llegan pedidos.

Si encuentras tiempo y todo lo anterior está limpio, pásamelo y decidimos qué priorizar.
