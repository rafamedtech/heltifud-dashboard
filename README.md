# Heltifud Dashboard

Panel administrativo construido con Nuxt UI para gestionar:

- autenticación administrativa con Supabase
- catálogo reutilizable de platillos
- menús semanales almacenados en Postgres mediante Prisma
- vista pública del menú activo en `/menu-publico`

## Stack

- Nuxt 4
- `@nuxt/ui`
- `@nuxtjs/supabase`
- Prisma 7 con `@prisma/adapter-pg`
- PostgreSQL

## Variables de entorno

Crea tu `.env` a partir de `.env.example` y define al menos:

```bash
DATABASE_URL=
NUXT_PUBLIC_SUPABASE_URL=
NUXT_PUBLIC_SUPABASE_KEY=
```

Variables recomendadas:

```bash
NUXT_SUPABASE_SECRET_KEY=
NUXT_PUBLIC_SITE_URL=
```

Notas:

- `DATABASE_URL` debe apuntar a la base Postgres donde vive el modelo de menús y catálogo.
- `NUXT_PUBLIC_SUPABASE_URL` y `NUXT_PUBLIC_SUPABASE_KEY` habilitan login y protección de rutas administrativas como `/`, `/menu/**` y `/platillos/**`.
- `NUXT_SUPABASE_SECRET_KEY` no es obligatoria para esta migración, pero conviene dejarla lista para tareas server-side futuras.
- `NUXT_PUBLIC_SITE_URL` se usa para SEO/meta públicas.

## Instalación

```bash
pnpm install
```

Genera el cliente de Prisma:

```bash
pnpm prisma:generate
```

Si tu base ya existe y sólo necesitas validar conexión:

```bash
pnpm prisma:validate
```

Si vas a aplicar migraciones pendientes:

```bash
pnpm prisma:migrate
```

Para cargar la data inicial incluida en `prisma/seed-data`:

```bash
pnpm prisma:migrate
pnpm prisma:seed
```

## Desarrollo

```bash
pnpm dev
```

La captura de Boneyard queda activa automáticamente al arrancar el dev server y vuelve a correr con cada actualización por HMR en las rutas públicas configuradas.

Si necesitas generar o refrescar los archivos `.bones.json` manualmente con el CLI:

```bash
pnpm bones:build
```

Modo watch:

```bash
pnpm bones:watch
```

Rutas principales:

- `/login`
- `/`
- `/menu`
- `/platillos`
- `/menu-publico`

## Calidad

```bash
pnpm lint
pnpm typecheck
```

## Base de datos esperada

El esquema Prisma define estas entidades:

- `WeeklyMenu`
- `MenuDay`
- `DaySlot`
- `FoodComponent`
- `FoodCatalogItem`

Y estos enums:

- `DayOfWeek`
- `SlotType`
- `ComponentRole`

## Observaciones

- El dashboard base de demo sigue existiendo en el repo, pero el flujo principal del producto ahora está centrado en login, admin y menú público.
- La sección `/planes` sigue siendo placeholder y no forma parte del flujo principal de esta migración.
- Boneyard escribe sus huesos en `app/bones` y queda inicializado automáticamente desde un plugin cliente.
- La captura automática del plugin de Vite está configurada para `/login` y `/menu-publico`, que son las rutas accesibles sin autenticación.
- Las pantallas administrativas ya aceptan Boneyard con fallback a los skeletons manuales actuales. Para generar bones reales de vistas protegidas hace falta capturarlas con una sesión autenticada.
