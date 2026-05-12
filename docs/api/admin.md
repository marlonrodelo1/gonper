# API Admin — contratos para el super-admin (admin.gestori.es)

Estos endpoints viven en este repo (gestori.es) y los consume el repo separado
del super-admin (admin.gestori.es). Todos requieren el header:

```
Authorization: Bearer ${INTERNAL_API_TOKEN}
```

El token está en las env vars de ambos proyectos en Dokploy. Cualquier
endpoint sin Authorization válido devuelve `401 Unauthorized`.

Base URL en producción: `https://gestori.es`

---

## Destacados marketplace

### `GET /api/v1/admin/destacados`

Lista todos los salones que pueden marcarse como destacados (activos +
visibles en marketplace + no cancelados).

Query params:
- `only=destacados` (opcional) → devuelve solo los que ya están destacados.

Respuesta:
```json
{
  "salones": [
    {
      "id": "uuid",
      "slug": "revolution-barber-shop",
      "nombre": "Revolution Barber shop",
      "tipoNegocio": "barberia",
      "ciudad": "Santa Úrsula",
      "destacado": false,
      "orden": null,
      "tieneCoordenadas": true
    }
  ]
}
```

### `PATCH /api/v1/admin/destacados`

Cambia el estado de destacado o el orden de un salón.

Body:
```json
{ "salon_id": "uuid", "destacado": true, "orden": 1 }
```

- Si `destacado: false`, se borra el orden automáticamente.
- `orden` es opcional; sin él, el salón aparece al final (nulls last).
- Cambios visibles en `/marketplace` en <60s (cache HTTP).

Respuestas:
- `200 ok` con el salón actualizado.
- `404 salon_no_existe`.

---

## Marcas

### `GET /api/v1/admin/marcas`
Lista todas las marcas (activas e inactivas) ordenadas por nombre.

### `POST /api/v1/admin/marcas`
Crea una marca.

Body (campos requeridos en negrita):
- **`slug`** string `[a-z0-9-]+`
- **`nombre`** string
- `descripcion?` string
- `logo_url?` URL
- `web_url?` URL
- `contacto_email?` email — a quién avisamos en pedidos B2B
- `contacto_telefono?` string
- `comision_porcentaje?` number 0-100 (default 15)
- `condiciones_b2b_minimo_eur?` number >= 0 (default 0)
- `activa?` bool (default true)

Errores:
- `409 slug_ya_existe`

### `GET|PATCH|DELETE /api/v1/admin/marcas/[id]`
- `PATCH`: cualquier subset de los campos POST.
- `DELETE`: soft delete (pone `activa=false`). No se borra para no romper FKs.

---

## Productos

### `GET /api/v1/admin/productos`
Lista todos los productos con `marcaNombre` joineado.

Query opcional:
- `marca_id=uuid` para filtrar por marca
- `categoria=capilar|barba|unas|estetica|accesorio|otro`
- `tipo_distribucion=stock|dropshipping`

El listado incluye join con `categorias_marca`: cada producto trae
`categoriaMarcaId`, `categoriaMarcaSlug`, `categoriaMarcaNombre` (los tres son
`null` si el producto no tiene categoría propia de marca).

### `POST /api/v1/admin/productos`
Body (requeridos en negrita):
- **`marca_id`** uuid
- **`slug`** string `[a-z0-9-]+`
- `sku?` string
- **`nombre`** string
- `descripcion?` string
- **`categoria`** uno de `capilar|barba|unas|estetica|accesorio|otro` (enum global, mantenida para no romper filtros existentes)
- `categoria_marca_id?` uuid — referencia a `categorias_marca`; **debe pertenecer a la misma marca**
- `tipo_distribucion?` `stock` (default) | `dropshipping` (preparación Wella; sin cambios de comportamiento hoy)
- `tipo_negocio_target?` array de `peluqueria|barberia|estetica|manicura|otro` (default [])
- `imagenes?` array de URLs (la primera = portada)
- `coste_mayorista_eur?` number >= 0 — info interna (lo que paga Gestori a la marca)
- **`precio_mayorista_eur`** number >= 0 — lo que paga el salón a Gestori
- **`precio_publico_recomendado_eur`** number >= 0
- `unidad_medida?` string (default "unidad")
- `peso_g?` integer
- `stock_disponible_marca?` integer
- `activo?` bool (default true)

Errores:
- `400 categoria_marca_no_existe` — `categoria_marca_id` no encontrada.
- `400 categoria_marca_no_pertenece_a_marca` — la categoría pertenece a otra marca.
- `409 slug_ya_existe_en_marca` — (marca_id, slug) único.

### `GET|PATCH|DELETE /api/v1/admin/productos/[id]`
- `PATCH`: cualquier subset de los campos POST salvo `marca_id` (un producto
  no cambia de marca; si necesitas eso, créalo nuevo y borra el viejo).
- `DELETE`: soft (`activo=false`).

### `POST /api/v1/admin/productos/bulk`

Inserción en lote (max 200 productos por llamada). El parsing CSV → JSON lo
hace el cliente.

Body:
```json
{
  "marca_id": "uuid",
  "productos": [
    { /* mismo shape que POST /productos individual, sin marca_id (se hereda del body) */ }
  ]
}
```

Validaciones previas al insert:
- Slugs duplicados dentro del array → `400 slugs_duplicados_en_csv`.
- Slugs ya existentes en BD para esa marca → `409 slugs_ya_existen_en_marca`.
- `categoria_marca_id` que no exista o pertenezca a otra marca → `400 categorias_marca_invalidas`.

Respuesta 201:
```json
{ "ok": true, "creados": 12, "productos": [{ "id": "uuid", "slug": "..." }] }
```

---

## Categorías por marca

Cada marca puede definir sus propias categorías (p. ej. Wella: "Champús",
"Tratamientos", "Styling"). Conviven con el enum global de `productos.categoria`
y los productos pueden tener ambas o solo la global.

### `GET /api/v1/admin/marcas/[id]/categorias`
Lista categorías de la marca (solo activas por defecto; añade
`?include_inactivas=1` para ver también las soft-deleted), ordenadas por
`orden` ascendente.

Respuesta:
```json
{
  "categorias": [
    {
      "id": "uuid",
      "marcaId": "uuid",
      "slug": "champus",
      "nombre": "Champús",
      "orden": 0,
      "activa": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

### `POST /api/v1/admin/marcas/[id]/categorias`
Crea una categoría dentro de la marca.

Body:
- **`slug`** string `[a-z0-9-]+`
- **`nombre`** string
- `orden?` integer 0-9999 (default 0)
- `activa?` bool (default true)

Errores:
- `404 marca_no_existe`.
- `409 slug_ya_existe_en_marca`.

### `GET|PATCH|DELETE /api/v1/admin/categorias-marca/[id]`
- `PATCH`: `nombre`, `orden`, `activa`.
- `DELETE`: soft (`activa=false`). Los productos que referencian la categoría
  mantienen el FK pero el UI puede filtrarlas si están inactivas.

---

## TODO (siguientes sprints)

- `GET|PATCH /api/v1/admin/pedidos-b2b/[id]/estado` — flujo de estados,
  notificar marca, dispara suma a `stock_salon` cuando se marca entregado.
- `GET /api/v1/admin/ventas-b2c` — dashboard de comisiones acumuladas y
  filtros por salón, fecha, estado.
- `POST /api/v1/admin/productos/[id]/imagenes` — upload directo a Supabase
  Storage bucket `salon-assets/productos/`.
- Modelo dropshipping (Wella): activación real del flag `tipo_distribucion`
  con checkout B2C distinto, reparto Connect, backoffice de tramitación.
