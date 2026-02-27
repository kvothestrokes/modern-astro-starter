# Frontend pedidos (Astro + Tailwind + Supabase)

Frontend SSR ligero para crear y administrar pedidos de productos personalizados.

## Stack

- Astro SSR con adapter Node (`@astrojs/node`)
- Tailwind CSS v4
- Supabase JS SDK
- JavaScript minimo en pasos que lo requieren (subida de imagenes y cambios rapidos de estado)

## Variables de entorno

Copia `.env.example` a `.env` y completa:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `PUBLIC_SUPABASE_STORAGE_BUCKET`

## Paso 0: actualizar esquema en Supabase

Ejecuta este script en Supabase SQL Editor:

- `supabase/sql/000_step0_incremental_updates.sql`

Este script:

- Refuerza constraints de estado en `orders`
- Define default y not null para `designs.status`
- Crea trigger para `orders.updated_at`
- Agrega unicidad en `design_assignments`
- Crea indices para filtros y paginacion en dashboard
- Agrega `designs.storage_path` para manejar archivos de Storage

## Rutas principales

### Publico cliente

- `/`
- `/pedido` (paso 1: datos generales)
- `/pedido/productos` (paso 2)
- `/pedido/disenos` (paso 3 + subida directa a Storage)
- `/pedido/resumen` (paso 4)
- `/pedido/exito`

### Interno admin

- `/admin/login`
- `/admin/pedidos`
- `/admin/pedidos/[id]`
- `/admin/disenos`

## Estructura relevante

```text
src/
  components/
    ui/
    order/
    admin/
  layouts/
    PublicLayout.astro
    AdminLayout.astro
  lib/
    env.ts
    supabase.ts
    constants.ts
    queries.ts
  pages/
    pedido/
    admin/
  types/
supabase/sql/
```

## Notas de implementacion

- El cliente sube imagenes directo a Supabase Storage (sin pasar por server de Astro).
- Se evita realtime y polling continuo para reducir consumo.
- Dashboard usa paginacion y filtros por query string.
- El wizard de pedido guarda borrador local en `localStorage` para evitar perdida de avance.

## Comandos

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`
