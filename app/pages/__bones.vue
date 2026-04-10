<script setup lang="ts">
import type {
  DayMenu,
  FoodCatalogItem,
  FoodCatalogItemDetail,
  FoodItemDetail,
  MenuSlot,
  WeeklyMenu
} from '~~/types/types'
import Skeleton from 'boneyard-js/vue'
import menuIndexBones from '~/bones/admin-menu-index.bones.json'
import { formatDate } from '~/utils/formatters'

definePageMeta({
  layout: false
})

useSeoMeta({
  title: 'Boneyard Capture Fixtures',
  robots: 'noindex, nofollow'
})

const loading = true

const catalogItems: FoodCatalogItem[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    nombre: 'Bowl de pollo con arroz integral',
    descripcion: 'Pechuga de pollo marinada con arroz integral y vegetales rostizados.',
    calorias: 540,
    imagen: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80',
    tipo: 'Proteina',
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-09T12:00:00.000Z'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    nombre: 'Papas cambray al romero',
    descripcion: 'Guarnicion dorada con aceite de oliva y romero.',
    calorias: 180,
    imagen: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80',
    tipo: 'Guarnicion',
    createdAt: '2026-04-02T10:00:00.000Z',
    updatedAt: '2026-04-09T12:00:00.000Z'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    nombre: 'Yogurt griego con berries',
    descripcion: 'Snack proteico con fruta fresca y granola ligera.',
    calorias: 220,
    imagen: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=80',
    tipo: 'Snack',
    createdAt: '2026-04-03T10:00:00.000Z',
    updatedAt: '2026-04-09T12:00:00.000Z'
  }
]

function itemFromCatalog(item: FoodCatalogItem): FoodItemDetail {
  return {
    catalogItemId: item.id,
    nombre: item.nombre,
    descripcion: item.descripcion,
    calorias: item.calorias,
    imagen: item.imagen,
    tipo: item.tipo
  }
}

function createSlot(main: FoodCatalogItem, extras: FoodCatalogItem[] = [], options?: {
  side1?: FoodCatalogItem
  side2?: FoodCatalogItem
  contenedor?: string
}): MenuSlot {
  return {
    platilloPrincipal: itemFromCatalog(main),
    guarnicion1: options?.side1 ? itemFromCatalog(options.side1) : null,
    guarnicion2: options?.side2 ? itemFromCatalog(options.side2) : null,
    contenedor: options?.contenedor ?? 'Contenedor kraft 28oz',
    adicionales: extras.map(itemFromCatalog)
  }
}

function createDay(dayOfWeek: DayMenu['dayOfWeek']): DayMenu {
  return {
    dayOfWeek,
    desayuno: createSlot(catalogItems[0], [catalogItems[2]], { side1: catalogItems[1] }),
    comida: createSlot(catalogItems[0], [], { side1: catalogItems[1] }),
    cena: createSlot(catalogItems[0], [catalogItems[2]]),
    snack1: createSlot(catalogItems[2]),
    snack2: createSlot(catalogItems[2])
  }
}

const fixtureMenu: WeeklyMenu = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Semana del 14 al 20 de abril',
  startDate: '2026-04-14',
  endDate: '2026-04-20',
  createdAt: '2026-04-08T09:30:00.000Z',
  updatedAt: '2026-04-09T14:10:00.000Z',
  isActive: true,
  days: [
    createDay('LUNES'),
    createDay('MARTES'),
    createDay('MIERCOLES'),
    createDay('JUEVES'),
    createDay('VIERNES'),
    createDay('SABADO'),
    createDay('DOMINGO')
  ]
}

const fixtureMenus: WeeklyMenu[] = [
  fixtureMenu,
  {
    ...fixtureMenu,
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    name: 'Semana del 21 al 27 de abril',
    startDate: '2026-04-21',
    endDate: '2026-04-27',
    createdAt: '2026-04-09T09:00:00.000Z',
    updatedAt: '2026-04-09T15:30:00.000Z',
    isActive: false
  }
]

const fixtureFoodItem: FoodCatalogItemDetail = {
  ...catalogItems[0],
  linkedMenus: fixtureMenus.map(menu => ({
    id: menu.id,
    name: menu.name
  }))
}
</script>

<template>
  <main class="min-h-screen bg-neutral-50 px-6 py-10 text-slate-900">
    <div class="mx-auto max-w-7xl space-y-10">
      <header class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Boneyard
        </p>
        <h1 class="text-3xl font-bold">
          Capture Fixtures
        </h1>
        <p class="max-w-3xl text-sm text-slate-600">
          Ruta pública para que Boneyard capture los skeletons de vistas protegidas usando componentes reales con datos de fixture.
        </p>
      </header>

      <section class="space-y-6">
        <Skeleton name="admin-menu-index" :initial-bones="menuIndexBones" :loading="loading">
          <section class="space-y-4">
            <section class="grid gap-3 lg:grid-cols-3">
              <div class="app-surface-soft relative px-4 py-4">
                <p class="pr-20 text-xs uppercase tracking-[0.18em] text-muted">
                  Menú activo
                </p>
                <div class="mt-3 space-y-1">
                  <p class="line-clamp-1 text-base font-semibold text-highlighted">
                    {{ fixtureMenus[0].name }}
                  </p>
                  <p class="text-sm text-muted">
                    {{ formatDate(fixtureMenus[0].startDate) }} - {{ formatDate(fixtureMenus[0].endDate) }}
                  </p>
                </div>
              </div>

              <div class="app-surface-soft px-4 py-4">
                <p class="text-xs uppercase tracking-[0.18em] text-muted">
                  Último agregado
                </p>
                <div class="mt-3 space-y-1">
                  <p class="line-clamp-1 text-base font-semibold text-highlighted">
                    {{ fixtureMenus[1].name }}
                  </p>
                  <p class="text-sm text-muted">
                    Creado el {{ formatDate(fixtureMenus[1].createdAt) }}
                  </p>
                </div>
              </div>

              <div class="app-surface-soft px-4 py-4">
                <p class="text-xs uppercase tracking-[0.18em] text-muted">
                  Menús creados
                </p>
                <div class="mt-3 space-y-1">
                  <p class="text-2xl font-bold text-highlighted">
                    {{ fixtureMenus.length }}
                  </p>
                  <p class="text-sm text-muted">
                    Total de menús semanales registrados.
                  </p>
                </div>
              </div>
            </section>

            <section class="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <UCard
                v-for="menu in fixtureMenus"
                :key="menu.id"
                class="app-surface"
                :ui="{
                  header: menu.isActive
                    ? 'bg-primary/18 text-highlighted px-5 py-4 sm:px-6'
                    : 'bg-default text-highlighted px-5 py-4 sm:px-6',
                  body: 'px-5 py-5 sm:px-6',
                  footer: 'px-5 py-4 sm:px-6'
                }"
              >
                <template #header>
                  <section class="flex items-start justify-between gap-3">
                    <div>
                      <h3 class="text-lg font-bold" :class="menu.isActive ? 'text-primary' : 'text-highlighted'">
                        {{ menu.name }}
                      </h3>
                      <p class="mt-1 text-sm" :class="menu.isActive ? 'text-slate-700' : 'text-muted'">
                        {{ formatDate(menu.startDate) }} - {{ formatDate(menu.endDate) }}
                      </p>
                    </div>

                    <section class="flex flex-wrap justify-end gap-2">
                      <UButton
                        :variant="menu.isActive ? 'solid' : 'soft'"
                        :color="menu.isActive ? 'success' : 'primary'"
                        icon="i-lucide-badge-check"
                        :class="menu.isActive ? 'text-white' : ''"
                      >
                        {{ menu.isActive ? 'Activo' : 'Activar' }}
                      </UButton>
                    </section>
                  </section>
                </template>

                <section class="space-y-3">
                  <section class="grid grid-cols-2 gap-2 text-sm">
                    <div class="rounded-xl bg-neutral-50 px-3 py-2">
                      <span class="text-muted">Creado</span>
                      <p class="font-medium text-highlighted">
                        {{ formatDate(menu.createdAt) }}
                      </p>
                    </div>
                    <div class="rounded-xl bg-neutral-50 px-3 py-2">
                      <span class="text-muted">Actualizado</span>
                      <p class="font-medium text-highlighted">
                        {{ formatDate(menu.updatedAt) }}
                      </p>
                    </div>
                  </section>
                </section>

                <template #footer>
                  <section class="flex flex-wrap justify-end gap-2">
                    <UButton variant="ghost" color="neutral" icon="i-lucide-square-pen">
                      Editar
                    </UButton>
                    <UButton color="error" variant="ghost" icon="i-lucide-trash">
                      Eliminar
                    </UButton>
                  </section>
                </template>
              </UCard>
            </section>
          </section>
        </Skeleton>

        <AdminMenuForm
          :catalog-items="catalogItems"
          :loading-slots="loading"
        />

        <AdminMenuForm
          :menu="fixtureMenu"
          :catalog-items="catalogItems"
          :loading-fields="loading"
          :loading-slots="loading"
          mode="edit"
        />

        <AdminFoodCatalogForm
          :item="fixtureFoodItem"
          :loading-fields="loading"
          :loading-sidebar="loading"
          mode="edit"
        />
      </section>
    </div>
  </main>
</template>
