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

### `POST /api/v1/admin/productos`
Body (requeridos en negrita):
- **`marca_id`** uuid
- **`slug`** string `[a-z0-9-]+`
- `sku?` string
- **`nombre`** string
- `descripcion?` string
- **`categoria`** uno de `capilar|barba|unas|estetica|accesorio|otro`
- `tipo_negocio_target?` array de `peluqueria|barberia|estetica|manicura|otro` (default [])
- `imagenes?` array de URLs (la primera = portada)
- **`precio_mayorista_eur`** number >= 0
- **`precio_publico_recomendado_eur`** number >= 0
- `unidad_medida?` string (default "unidad")
- `peso_g?` integer
- `stock_disponible_marca?` integer
- `activo?` bool (default true)

Errores:
- `409 slug_ya_existe_en_marca` — (marca_id, slug) único.

### `GET|PATCH|DELETE /api/v1/admin/productos/[id]`
- `PATCH`: cualquier subset de los campos POST salvo `marca_id` (un producto
  no cambia de marca; si necesitas eso, créalo nuevo y borra el viejo).
- `DELETE`: soft (`activo=false`).

---

## TODO (siguientes sprints)

- `GET|PATCH /api/v1/admin/pedidos-b2b/[id]/estado` — flujo de estados,
  notificar marca, dispara suma a `stock_salon` cuando se marca entregado.
- `GET /api/v1/admin/ventas-b2c` — dashboard de comisiones acumuladas y
  filtros por salón, fecha, estado.
- `POST /api/v1/admin/productos/[id]/imagenes` — upload directo a Supabase
  Storage bucket `salon-assets/productos/`.
