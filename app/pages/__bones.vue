<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
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

type SkeletonResponsiveBones = {
  breakpoints: Record<number, {
    name: string
    viewportWidth: number
    width: number
    height: number
    bones: Array<{
      x: number
      y: number
      w: number
      h: number
      r: number | string
      c?: boolean
    }>
  }>
}

definePageMeta({
  layout: false
})

useSeoMeta({
  title: 'Boneyard Capture Fixtures',
  robots: 'noindex, nofollow'
})

const loading = true
const menuIndexSkeleton = menuIndexBones as unknown as SkeletonResponsiveBones
const UButton = resolveComponent('UButton')
const fixtureSelectedMenuTypeTab = ref<WeeklyMenu['menuType']>('ESTANDAR')

function formatMenuDateRangeValue(date: string) {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short'
  }).format(new Date(date))
}

function formatMenuDateRange(date: string, endDate: string) {
  return `${formatMenuDateRangeValue(date)} - ${formatMenuDateRangeValue(endDate)}`
}

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
  const mainItem = catalogItems[0]!
  const sideItem = catalogItems[1]!
  const snackItem = catalogItems[2]!

  return {
    dayOfWeek,
    desayuno: createSlot(mainItem, [snackItem], { side1: sideItem }),
    comida: createSlot(mainItem, [], { side1: sideItem }),
    cena: createSlot(mainItem, [snackItem]),
    snack1: createSlot(snackItem),
    snack2: createSlot(snackItem)
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
  menuType: 'ESTANDAR',
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
    isActive: true,
    menuType: 'VEGETARIANO'
  }
]
const fixtureStandardMenus = computed(() => fixtureMenus.filter(menu => menu.menuType === 'ESTANDAR'))
const fixtureVegetarianMenus = computed(() => fixtureMenus.filter(menu => menu.menuType === 'VEGETARIANO'))
const fixtureFilteredMenus = computed(() =>
  fixtureSelectedMenuTypeTab.value === 'VEGETARIANO'
    ? fixtureVegetarianMenus.value
    : fixtureStandardMenus.value
)
const fixtureMenuTypeTabs = computed(() => [
  {
    label: 'Estándar',
    value: 'ESTANDAR',
    icon: 'i-lucide-utensils',
    badge: fixtureStandardMenus.value.length
  },
  {
    label: 'Vegetariano',
    value: 'VEGETARIANO',
    icon: 'i-lucide-leaf',
    badge: fixtureVegetarianMenus.value.length
  }
])
const fixtureSummaryCards = [
  {
    key: 'active-menu',
    title: 'Menú activo',
    description: formatMenuDateRange(fixtureMenus[0]!.startDate, fixtureMenus[0]!.endDate),
    icon: 'i-lucide-badge-check',
    statIcon: 'i-lucide-eye',
    stat: 'Visible ahora',
    actionLabel: 'Abrir'
  },
  {
    key: 'latest-menu',
    title: 'Último agregado',
    description: fixtureMenus[1]!.name,
    icon: 'i-lucide-sparkles',
    statIcon: 'i-lucide-calendar-days',
    stat: formatDate(fixtureMenus[1]!.createdAt),
    actionLabel: 'Editar'
  },
  {
    key: 'total-menus',
    title: 'Menús creados',
    description: 'Conteo total de menús semanales registrados en el panel.',
    icon: 'i-lucide-files',
    statIcon: 'i-lucide-chart-column',
    stat: `${fixtureMenus.length} registros`,
    actionLabel: 'Nuevo'
  }
]

const fixtureMenuColumns: TableColumn<WeeklyMenu>[] = [
  {
    accessorKey: 'name',
    header: 'Menú',
    cell: ({ row }) =>
      h('p', { class: 'truncate py-1 font-medium text-highlighted' }, row.original.name)
  },
  {
    accessorKey: 'dateRange',
    header: 'Fechas',
    cell: ({ row }) =>
      h('p', { class: 'py-1 text-sm text-highlighted' }, `${formatMenuDateRangeValue(row.original.startDate)} - ${formatMenuDateRangeValue(row.original.endDate)}`)
  },
  {
    accessorKey: 'updatedAt',
    header: 'Actualizado',
    cell: ({ row }) => h('span', { class: 'text-sm text-toned' }, formatDate(row.original.updatedAt))
  },
  {
    id: 'details',
    header: () => h('div', { class: 'text-center' }, 'Detalles'),
    cell: ({ row }) =>
      h('div', { class: 'flex justify-center' }, [
        h(UButton, {
          to: `/menu/${row.original.id}`,
          color: 'primary',
          variant: 'ghost',
          icon: 'i-lucide-square-arrow-out-up-right',
          'aria-label': 'Ver detalles'
        })
      ])
  }
]

const fixtureTableMeta = {
  class: {
    tr: (row: { original: WeeklyMenu }) => row.original.isActive ? 'bg-success/10' : ''
  }
}

const fixtureFoodItem: FoodCatalogItemDetail = {
  ...catalogItems[0]!,
  linkedMenus: fixtureMenus.map(menu => ({
    id: menu.id,
    name: menu.name
  }))
}
</script>

<template>
  <main
    class="min-h-screen bg-neutral-50 px-6 py-10 text-slate-900"
    data-testid="bones-root"
  >
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
        <section class="space-y-4">
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-primary">
              Menús registrados
            </h2>
          </div>

          <Skeleton name="admin-menu-index" :initial-bones="menuIndexSkeleton" :loading="loading">
            <section class="space-y-4" data-testid="bones-menu-index">
            <section class="grid gap-3 lg:grid-cols-3">
              <UCard
                v-for="card in fixtureSummaryCards"
                :key="card.key"
                :ui="{
                  root: 'group relative overflow-hidden rounded-2xl border border-default/70 ring-0 divide-y-0 bg-elevated/35 shadow-sm shadow-black/5',
                  body: 'relative flex min-h-[176px] flex-col p-4 sm:p-4.5'
                }"
              >
                <div class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                  <UIcon :name="card.icon" class="size-4" />
                </div>

                <div class="mt-4 space-y-2">
                  <div class="space-y-1.5">
                    <p class="text-base font-semibold text-highlighted">
                      {{ card.title }}
                    </p>
                    <p class="line-clamp-2 text-sm leading-5 text-muted">
                      {{ card.description }}
                    </p>
                  </div>
                </div>

                <div class="mt-auto pt-5">
                  <div class="border-t border-default/70 pt-3">
                    <div class="flex items-center justify-between gap-3">
                      <div class="flex min-w-0 items-center gap-2 text-muted">
                        <UIcon :name="card.statIcon" class="size-4 shrink-0" />
                        <span class="truncate text-sm">{{ card.stat }}</span>
                      </div>

                      <UButton
                        size="sm"
                        variant="ghost"
                        color="neutral"
                        icon="i-lucide-arrow-right"
                        trailing
                        :ui="{ base: 'rounded-lg px-2.5 text-muted hover:text-highlighted' }"
                      >
                        {{ card.actionLabel }}
                      </UButton>
                    </div>
                  </div>
                </div>
              </UCard>
            </section>

            <section class="space-y-4">
              <UCard
                :ui="{
                  root: 'overflow-hidden rounded-2xl border border-default/70 ring-0 divide-y-0 bg-elevated/35 shadow-sm shadow-black/5',
                  body: 'p-0 sm:p-0'
                }"
              >
                <div class="space-y-5 p-5 sm:p-6">
                  <UTabs
                    v-model="fixtureSelectedMenuTypeTab"
                    :items="fixtureMenuTypeTabs"
                    color="primary"
                    variant="pill"
                    size="sm"
                    :ui="{
                      root: 'w-full gap-4',
                      list: 'w-full overflow-x-auto rounded-xl bg-elevated p-1 sm:w-fit',
                      trigger: 'shrink-0 justify-center',
                      content: 'w-full'
                    }"
                  >
                    <template #content>
                      <UTable
                        :data="fixtureFilteredMenus"
                        :columns="fixtureMenuColumns"
                        :meta="fixtureTableMeta"
                        class="shrink-0"
                        :ui="{
                          base: 'table-fixed border-separate border-spacing-0',
                          thead: '[&>tr]:bg-default [&>tr]:after:content-none',
                          tbody: '[&>tr]:last:[&>td]:border-b-0',
                          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r max-md:[&:nth-child(3)]:hidden',
                          td: 'border-b border-default align-top max-md:[&:nth-child(3)]:hidden'
                        }"
                      />
                    </template>
                  </UTabs>
                </div>
              </UCard>
            </section>
            </section>
          </Skeleton>
        </section>

        <div data-testid="bones-menu-create">
          <AdminMenuForm
            :catalog-items="catalogItems"
            :loading-slots="loading"
          />
        </div>

        <div data-testid="bones-menu-edit">
          <AdminMenuForm
            :menu="fixtureMenu"
            :catalog-items="catalogItems"
            :loading-fields="loading"
            :loading-slots="loading"
            mode="edit"
          />
        </div>

        <div data-testid="bones-food-edit">
          <AdminFoodCatalogForm
            :item="fixtureFoodItem"
            :loading-fields="loading"
            :loading-sidebar="loading"
            mode="edit"
          />
        </div>
      </section>
    </div>
  </main>
</template>
