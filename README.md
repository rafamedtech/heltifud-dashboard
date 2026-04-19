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

Variables opcionales para lookup nutricional:

```bash
FATSECRET_CLIENT_ID=
FATSECRET_CLIENT_SECRET=
USDA_FDC_API_KEY=
```

Notas:

- `DATABASE_URL` debe apuntar a la base Postgres donde vive el modelo de menús y catálogo.
- `NUXT_PUBLIC_SUPABASE_URL` y `NUXT_PUBLIC_SUPABASE_KEY` habilitan login y protección de rutas administrativas como `/`, `/menu/**` y `/platillos/**`.
- `NUXT_SUPABASE_SECRET_KEY` no es obligatoria para esta migración, pero conviene dejarla lista para tareas server-side futuras.
- `NUXT_PUBLIC_SITE_URL` se usa para SEO/meta públicas.
- `FATSECRET_CLIENT_ID`, `FATSECRET_CLIENT_SECRET` y `USDA_FDC_API_KEY` sólo son necesarias si vas a habilitar los lookups nutricionales externos.

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

## Deploy en Netlify

Configuración mínima incluida en este repo:

- módulo oficial `@netlify/nuxt` para integrar Nuxt/Nitro con Netlify
- `netlify.toml` con `pnpm build`, publish dir `dist`, Node `20` y `PNPM_FLAGS=--shamefully-hoist`
- `.gitignore` actualizado para excluir `.netlify/`

Comandos típicos:

```bash
pnpm install
pnpm build
netlify login
netlify link --git-remote-url https://github.com/rafamedtech/heltifud-dashboard.git
netlify env:import .env
```

Notas de Prisma para producción:

- el proyecto ya usa `engineType = "client"` con `@prisma/adapter-pg`, así que no necesita binarios Rust adicionales en Netlify
- no se configuró `prisma migrate deploy` dentro del build para evitar migraciones automáticas en cada deploy; es más seguro ejecutarlo manualmente cuando tu base productiva esté lista

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

Checks de UI con Playwright:

```bash
pnpm test:e2e
pnpm test:e2e:update
pnpm check:ui
pnpm test:ui
```

Notas:

- `pnpm test:e2e` levanta Nuxt automáticamente en `http://127.0.0.1:3101` si no ya existe un server.
- `pnpm test:e2e:update` refresca snapshots visuales cuando un cambio de UI es intencional.
- `pnpm test:ui` corre Playwright directamente para validar cambios visuales rápido.
- `pnpm check:ui` corre `lint`, `typecheck` y Playwright para una pasada completa.
- CI ahora ejecuta Playwright en cada `push` y `pull_request`.

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
