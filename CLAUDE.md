# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev                 # Start development server
pnpm build               # Build for production
pnpm lint                # Run ESLint
pnpm typecheck           # TypeScript type checking
pnpm test:e2e            # Run Playwright e2e tests (requires dev server on port 3101)
pnpm test:e2e:serve      # Start dev server for e2e tests (port 3101)
pnpm test:e2e:ui         # Playwright interactive UI mode
pnpm bones:build         # Build Boneyard visual snapshots
pnpm bones:watch         # Watch and rebuild Boneyard snapshots
pnpm prisma:generate     # Regenerate Prisma client after schema changes
pnpm prisma:migrate      # Apply pending migrations (production)
pnpm prisma:studio       # Open Prisma Studio GUI
pnpm prisma:seed         # Seed the database
```

After modifying `prisma/schema.prisma`, always run `pnpm prisma:generate` to update the generated client at `prisma/generated/client/`.

## Architecture

### Stack
- **Nuxt 4** with the `app/` directory structure, Vue 3 Composition API
- **@nuxt/ui v4** for all UI components (UButton, USidebar, UNavigationMenu, etc.)
- **Tailwind CSS v4**
- **Prisma 7** with `@prisma/adapter-pg` (driver adapters, no query engine binary) — client generated to `prisma/generated/client/`
- **Supabase** for authentication (`@nuxtjs/supabase`)
- **Boneyard.js** for visual regression snapshots at breakpoints 375/768/1280px
- **Playwright** for e2e tests
- Deployed on **Netlify**

### Directory structure

```
app/
  layouts/admin.vue          # Main admin shell: collapsible USidebar + nav items
  pages/                     # File-based routes (all admin, Spanish slugs)
  components/admin/          # Admin form/editor/page components
  components/public/         # Public menu page components
  composables/               # API wrappers and shared reactive state
  utils/api-errors.ts        # getApiErrorMessage() — used in all composables
  bones/                     # Auto-generated Boneyard snapshot files (do not edit)
server/
  middleware/admin-auth.ts   # Auth guard for all /api/* routes
  api/                       # Nitro route handlers (file-based, HTTP method suffixes)
  services/nutrition/        # Nutrition lookup and calculation services
  utils/prisma.ts            # Singleton PrismaClient via globalThis
  utils/session.ts           # getSessionAppUser / requireAdminSessionUser helpers
types/
  types.ts                   # All shared TypeScript interfaces and enum value arrays
  menuSchema.ts              # Zod schemas for menu validation
prisma/
  schema.prisma              # Database schema (PostgreSQL, all enums in Spanish)
  generated/client/          # Generated Prisma client (committed, do not edit manually)
  migrations/                # SQL migration history
  seed-data/                 # CSV files used by seed.ts
```

### Authentication & authorization

Supabase handles login/session. The server middleware (`server/middleware/admin-auth.ts`) enforces:
- `/api/admin/*` — requires `ADMIN` role (via `requireAdminSessionUser`)
- `/api/menu/*`, `/api/food-components/*`, and menu mutations — require authenticated Supabase user
- `GET /api/menu` and `GET /api/menu/next` — public (no auth)

Frontend route protection is handled by `@nuxtjs/supabase` redirect rules in `nuxt.config.ts`. Protected frontend routes: `/configuracion`, `/menu/*`, `/platillos/*`, `/planes/*`, `/usuarios/*`.

Session user is fetched server-side via `GET /api/session/me`, which cross-references the Supabase user with the Prisma `User` table by `authUserId` or email.

### Data model key concepts

The domain is a **meal delivery service** with these core entities:
- **WeeklyMenu** → MenuDay (day of week) → DaySlot (meal time: DESAYUNO/COMIDA/CENA/SNACK1/SNACK2) → FoodComponent (platillo/guarnición)
- **FoodCatalogItem** — reusable dish catalog; each may have an associated **Recipe** with **RecipeIngredient** entries referencing **SupplyItem**s
- **SupplyItem** — ingredients with nutrition data (sourced from USDA, FatSecret, or manual entry)
- **Plan** — subscription tier (DESAYUNO/COMIDA/CENA type, dish count, price)
- **Order** → OrderPlan → OrderPlanSlot → OrderPlanSlotComponent — order line items with menu slot assignments
- **MenuPublication** — a published snapshot of a WeeklyMenu for a delivery cycle, with DeliveryWindows and PublicationSlots

All enums and most field names are in Spanish (e.g., `nombre`, `descripcion`, `calorias`, `insumos`).

### Composables pattern

Composables in `app/composables/` wrap `$fetch` calls and always use `getApiErrorMessage(error, fallback)` from `app/utils/api-errors.ts` for consistent error handling. The `useEditorState()` composable provides shared dirty/valid/submitting state used by all editor pages.

### Server API conventions

Routes follow Nuxt file-based naming: `server/api/[resource]/[id]/index.[method].ts`. Server utils are auto-imported. The Prisma client is accessed via the `prisma` proxy exported from `server/utils/prisma.ts` (singleton via `globalThis`).

### Environment variables

- `DATABASE_URL` — PostgreSQL connection string (required)
- `NUXT_PUBLIC_SITE_URL` — public site URL
- Supabase variables managed by `@nuxtjs/supabase` (see module docs for names)

## Framework reference docs

Detailed reference docs for Nuxt and Nuxt UI are available in `.agents/skills/`. Read the specific file you need — do not load all at once.

- **Nuxt UI components**: `.agents/skills/nuxt-ui/references/components.md` — all 125+ components with props and usage
- **Nuxt UI theming**: `.agents/skills/nuxt-ui/references/theming.md` — CSS variables, custom colors, overrides
- **Nuxt UI composables**: `.agents/skills/nuxt-ui/references/composables.md` — useToast, useOverlay, defineShortcuts
- **Nuxt UI dashboard layout**: `.agents/skills/nuxt-ui/references/layouts/dashboard.md` — USidebar, UDashboardPanel
- **Nuxt data fetching**: `.agents/skills/nuxt/references/core-data-fetching.md` — useFetch, useAsyncData, $fetch
- **Nuxt server routes**: `.agents/skills/nuxt/references/features-server.md` — API routes, middleware, Nitro
- **Nuxt routing**: `.agents/skills/nuxt/references/core-routing.md` — file-based routing, middleware, layouts
- **Nuxt SSR best practices**: `.agents/skills/nuxt/references/best-practices-ssr.md` — hydration, composable patterns
- **Nuxt UI generated theme files**: `.nuxt/ui/<component>.ts` — all slots, variants, default classes per component
- **Nuxt docs index**: `llms.txt` at repo root — links to all Nuxt v5 documentation pages
