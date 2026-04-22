<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { PlanSummary, PlanType } from '~~/types/types'
import { PLAN_TYPE_VALUES } from '~~/types/types'
import { formatDate } from '~/utils/formatters'

definePageMeta({
  layout: 'admin',
  middleware: ['supabase-auth']
})

useSeoMeta({
  title: 'Gestión de planes | Heltifud Meal Preps',
  description: 'Administra la oferta de planes dentro del panel administrativo de Heltifud Meal Preps.',
  robots: 'noindex, nofollow'
})

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const summaryCardPlaceholders = [1, 2, 3]

const search = ref('')
const typeFilter = ref<'all' | PlanType>('all')
const statusFilter = ref<'all' | 'active' | 'inactive'>('all')

const typeOptions = [
  { label: 'Todos los tipos', value: 'all' },
  ...PLAN_TYPE_VALUES.map(value => ({
    label: formatPlanType(value),
    value
  }))
]

const statusOptions = [
  { label: 'Todos los estados', value: 'all' },
  { label: 'Activos', value: 'active' },
  { label: 'Inactivos', value: 'inactive' }
]

const {
  data: plans,
  refresh,
  error,
  status
} = await useLazyFetch<PlanSummary[]>('/api/plans', {
  default: () => []
})

const { deletePlanOnDB } = usePlans()
const toast = useToast()
const pendingDeletePlan = ref<PlanSummary | null>(null)
const deletingId = ref<string | null>(null)

const isLoading = computed(() => status.value === 'pending')
const hasPlans = computed(() => plans.value.length > 0)
const hasActiveFilters = computed(() =>
  Boolean(search.value.trim())
  || typeFilter.value !== 'all'
  || statusFilter.value !== 'all'
)

const filteredPlans = computed(() => {
  const normalizedSearch = normalizeText(search.value)

  return plans.value.filter((plan) => {
    const matchesSearch = !normalizedSearch
      || normalizeText([
        plan.nombre,
        plan.slug ?? '',
        plan.notas,
        plan.tags.join(' ')
      ].join(' ')).includes(normalizedSearch)

    const matchesType = typeFilter.value === 'all' || plan.tipo === typeFilter.value
    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'active' ? plan.isActive : !plan.isActive)

    return matchesSearch && matchesType && matchesStatus
  })
})

const activePlansCount = computed(() =>
  plans.value.filter(plan => plan.isActive).length
)
const totalDishCount = computed(() =>
  plans.value.reduce((sum, plan) => sum + plan.dishCount, 0)
)
const activeRevenue = computed(() =>
  plans.value
    .filter(plan => plan.isActive)
    .reduce((sum, plan) => sum + plan.precio, 0)
)

const summaryCards = computed(() => [
  {
    key: 'active',
    title: 'Planes activos',
    description: 'Oferta disponible actualmente para operación y captura.',
    icon: 'i-lucide-badge-check',
    statIcon: 'i-lucide-shield-check',
    stat: countLabel(activePlansCount.value, 'plan activo', 'planes activos'),
    actionLabel: 'Filtrar',
    actionTo: null,
    onAction: () => {
      search.value = ''
      typeFilter.value = 'all'
      statusFilter.value = 'active'
    }
  },
  {
    key: 'dishes',
    title: 'Platillos configurados',
    description: 'Suma total de platillos incluidos entre todos los planes.',
    icon: 'i-lucide-utensils-crossed',
    statIcon: 'i-lucide-chart-column',
    stat: `${totalDishCount.value} ${totalDishCount.value === 1 ? 'platillo' : 'platillos'}`,
    actionLabel: 'Crear',
    actionTo: '/planes/crear-nuevo',
    onAction: null
  },
  {
    key: 'revenue',
    title: 'Valor activo',
    description: 'Suma del precio base de los planes marcados como activos.',
    icon: 'i-lucide-wallet',
    statIcon: 'i-lucide-badge-dollar-sign',
    stat: formatCurrency(activeRevenue.value),
    actionLabel: 'Ver todos',
    actionTo: null,
    onAction: () => {
      clearFilters()
    }
  }
])

const columns: TableColumn<PlanSummary>[] = [
  {
    accessorKey: 'nombre',
    header: 'Plan',
    cell: ({ row }) => h('div', { class: 'space-y-1 py-1' }, [
      h('p', { class: 'font-medium text-highlighted' }, row.original.nombre),
      h('p', { class: 'text-sm text-muted' }, row.original.slug || 'Slug automático')
    ])
  },
  {
    accessorKey: 'tipo',
    header: 'Tipo',
    cell: ({ row }) => h(UBadge, {
      color: typeColorMap[row.original.tipo],
      variant: 'subtle'
    }, () => formatPlanType(row.original.tipo))
  },
  {
    accessorKey: 'precio',
    header: () => h('div', { class: 'text-right' }, 'Precio'),
    cell: ({ row }) => h('div', { class: 'text-right text-toned' }, formatCurrency(row.original.precio))
  },
  {
    accessorKey: 'dishCount',
    header: () => h('div', { class: 'text-right' }, 'Platillos'),
    cell: ({ row }) => h('div', { class: 'text-right text-toned' }, row.original.dishCount)
  },
  {
    accessorKey: 'isActive',
    header: 'Estado',
    cell: ({ row }) => h(UBadge, {
      color: row.original.isActive ? 'success' : 'neutral',
      variant: 'subtle'
    }, () => row.original.isActive ? 'Activo' : 'Inactivo')
  },
  {
    accessorKey: 'ordersCount',
    header: () => h('div', { class: 'text-right' }, 'Pedidos'),
    cell: ({ row }) => h('div', { class: 'text-right text-toned' }, row.original.ordersCount)
  },
  {
    accessorKey: 'updatedAt',
    header: 'Actualizado',
    cell: ({ row }) => h('span', { class: 'text-sm text-toned' }, formatDate(row.original.updatedAt))
  },
  {
    id: 'actions',
    header: () => h('div', { class: 'text-center' }, 'Acciones'),
    cell: ({ row }) => h('div', { class: 'flex justify-center gap-1' }, [
      h(UButton, {
        'to': `/planes/${row.original.id}`,
        'color': 'primary',
        'variant': 'ghost',
        'icon': 'i-lucide-square-pen',
        'aria-label': `Editar ${row.original.nombre}`
      }),
      h(UButton, {
        'color': 'error',
        'variant': 'ghost',
        'icon': 'i-lucide-trash-2',
        'aria-label': `Eliminar ${row.original.nombre}`,
        'disabled': row.original.ordersCount > 0 || deletingId.value === row.original.id,
        'loading': deletingId.value === row.original.id,
        'onClick': () => requestDelete(row.original)
      })
    ])
  }
]

const deleteModalDescription = computed(() =>
  pendingDeletePlan.value
    ? `Se eliminará "${pendingDeletePlan.value.nombre}". Esta acción no se puede deshacer.`
    : undefined
)
const isDeleteModalOpen = computed({
  get: () => Boolean(pendingDeletePlan.value),
  set: (value) => {
    if (!value) {
      pendingDeletePlan.value = null
    }
  }
})

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX')
    .trim()
}

function countLabel(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`
}

function formatPlanType(value: PlanType) {
  return {
    DESAYUNO: 'Desayuno',
    COMIDA: 'Comida',
    CENA: 'Cena'
  }[value]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2
  }).format(value)
}

function clearFilters() {
  search.value = ''
  typeFilter.value = 'all'
  statusFilter.value = 'all'
}

function requestDelete(plan: PlanSummary) {
  pendingDeletePlan.value = plan
}

async function onDelete() {
  if (!pendingDeletePlan.value) {
    return
  }

  deletingId.value = pendingDeletePlan.value.id

  try {
    await deletePlanOnDB(pendingDeletePlan.value.id)
    await refresh()
    toast.add({
      title: 'Plan eliminado',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
  } catch (error) {
    toast.add({
      title: 'No se pudo eliminar el plan',
      description: error instanceof Error ? error.message : 'Intenta de nuevo en unos segundos.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    deletingId.value = null
    pendingDeletePlan.value = null
  }
}

const typeColorMap: Record<PlanType, 'primary' | 'warning' | 'secondary'> = {
  DESAYUNO: 'warning',
  COMIDA: 'primary',
  CENA: 'secondary'
}
</script>

<template>
  <main class="flex min-h-full flex-col space-y-6">
    <section class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="space-y-2">
        <div class="space-y-1">
          <h1 class="text-3xl font-semibold tracking-tight text-primary">
            Planes
          </h1>
          <p class="max-w-2xl text-sm text-muted">
            Gestiona los planes comerciales por tipo de comida, ajusta precios, cantidad de platillos y disponibilidad.
          </p>
        </div>
      </div>

      <div class="flex w-full items-center gap-3 lg:w-auto lg:justify-end">
        <UButton
          to="/planes/crear-nuevo"
          icon="i-lucide-plus"
          class="w-full justify-center lg:w-auto"
          size="lg"
        >
          Nuevo plan
        </UButton>
      </div>
    </section>

    <section class="space-y-4">
      <section class="grid gap-3 lg:grid-cols-3">
        <template v-if="isLoading">
          <UCard
            v-for="placeholder in summaryCardPlaceholders"
            :key="`plan-summary-skeleton-${placeholder}`"
            :ui="{
              root: 'overflow-hidden rounded-2xl border border-default/70 ring-0 divide-y-0 bg-elevated/35 shadow-sm shadow-black/5',
              body: 'flex min-h-[176px] flex-col p-4 sm:p-4.5'
            }"
          >
            <div class="size-9 animate-pulse rounded-lg bg-elevated" />
            <div class="mt-4 space-y-2">
              <div class="h-5 w-28 animate-pulse rounded-md bg-elevated" />
              <div class="h-4 w-full animate-pulse rounded-md bg-elevated" />
              <div class="h-4 w-3/4 animate-pulse rounded-md bg-elevated" />
            </div>
            <div class="mt-auto pt-5">
              <div class="border-t border-default/70 pt-3">
                <div class="flex items-center justify-between gap-3">
                  <div class="h-4 w-24 animate-pulse rounded-md bg-elevated" />
                  <div class="h-8 w-16 animate-pulse rounded-lg bg-elevated" />
                </div>
              </div>
            </div>
          </UCard>
        </template>

        <template v-else>
          <UCard
            v-for="card in summaryCards"
            :key="card.key"
            :ui="{
              root: 'group relative overflow-hidden rounded-2xl border border-default/70 ring-0 divide-y-0 bg-elevated/35 shadow-sm shadow-black/5 transition-colors duration-200 hover:border-default',
              body: 'relative flex min-h-[176px] flex-col p-4 sm:p-4.5'
            }"
          >
            <div class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <UIcon :name="card.icon" class="size-4" />
            </div>

            <div class="mt-4 space-y-1.5">
              <p class="text-base font-semibold text-highlighted">
                {{ card.title }}
              </p>
              <p class="line-clamp-2 text-sm leading-5 text-muted">
                {{ card.description }}
              </p>
            </div>

            <div class="mt-auto pt-5">
              <div class="border-t border-default/70 pt-3">
                <div class="flex items-center justify-between gap-3">
                  <div class="flex min-w-0 items-center gap-2 text-muted">
                    <UIcon :name="card.statIcon" class="size-4 shrink-0" />
                    <span class="truncate text-sm">{{ card.stat }}</span>
                  </div>

                  <UButton
                    v-if="card.actionTo"
                    :to="card.actionTo"
                    size="sm"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-plus"
                    :ui="{ base: 'rounded-lg px-2.5 text-muted hover:text-highlighted' }"
                  >
                    {{ card.actionLabel }}
                  </UButton>

                  <UButton
                    v-else
                    size="sm"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-filter"
                    :ui="{ base: 'rounded-lg px-2.5 text-muted hover:text-highlighted' }"
                    @click="card.onAction?.()"
                  >
                    {{ card.actionLabel }}
                  </UButton>
                </div>
              </div>
            </div>
          </UCard>
        </template>
      </section>

      <UAlert
        v-if="error"
        title="No se pudieron cargar los planes"
        :description="error.message || 'Intenta recargar la página en un momento.'"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
      />

      <UCard
        :ui="{
          root: 'overflow-hidden rounded-2xl border border-default/70 ring-0 divide-y-0 bg-elevated/35 shadow-sm shadow-black/5',
          body: 'p-0 sm:p-0'
        }"
      >
        <div class="space-y-5 p-5 sm:p-6">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div class="space-y-1">
              <h2 class="text-lg font-semibold text-primary">
                Catálogo de planes
              </h2>
              <p class="text-sm text-muted">
                {{ filteredPlans.length }} {{ filteredPlans.length === 1 ? 'resultado' : 'resultados' }}
                sobre {{ plans.length }} {{ plans.length === 1 ? 'registro' : 'registros' }}.
              </p>
            </div>

            <UButton
              v-if="hasActiveFilters"
              variant="ghost"
              color="neutral"
              icon="i-lucide-rotate-ccw"
              @click="clearFilters"
            >
              Limpiar filtros
            </UButton>
          </div>

          <div class="grid gap-3 lg:grid-cols-[minmax(0,1.8fr)_repeat(2,minmax(0,0.8fr))]">
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Buscar por nombre, slug, tags o notas"
              size="lg"
            />

            <USelect
              v-model="typeFilter"
              :items="typeOptions"
              size="lg"
              placeholder="Tipo"
            />

            <USelect
              v-model="statusFilter"
              :items="statusOptions"
              size="lg"
              placeholder="Estado"
            />
          </div>

          <UAlert
            v-if="!isLoading && !hasPlans"
            title="Aún no hay planes"
            description="Crea el primer plan para empezar a modelar la oferta comercial."
            color="neutral"
            variant="soft"
            icon="i-lucide-package-open"
          />

          <UAlert
            v-else-if="!isLoading && !filteredPlans.length"
            title="No hay coincidencias"
            description="Ajusta tu búsqueda o limpia los filtros para volver a ver registros."
            color="neutral"
            variant="soft"
            icon="i-lucide-filter-x"
          />

          <div
            v-else-if="!isLoading"
            class="overflow-x-auto rounded-xl border border-default/70 admin-scrollbar"
          >
            <UTable
              :data="filteredPlans"
              :columns="columns"
              class="shrink-0"
              :ui="{
                base: 'min-w-[980px] table-fixed border-separate border-spacing-0',
                thead: '[&>tr]:bg-default [&>tr]:after:content-none',
                tbody: '[&>tr]:last:[&>td]:border-b-0',
                th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
                td: 'border-b border-default align-top'
              }"
            />
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="placeholder in 4"
              :key="`plan-row-skeleton-${placeholder}`"
              class="h-16 animate-pulse rounded-xl border border-default/70 bg-default/40"
            />
          </div>
        </div>
      </UCard>
    </section>
  </main>

  <UModal
    v-model:open="isDeleteModalOpen"
    title="Eliminar plan"
    :description="deleteModalDescription"
  >
    <template #body>
      <p class="text-sm text-muted">
        Esta acción eliminará el plan del catálogo administrativo.
      </p>
    </template>

    <template #footer>
      <div class="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <UButton
          color="neutral"
          variant="ghost"
          block
          class="cursor-pointer sm:w-auto"
          @click="isDeleteModalOpen = false"
        >
          Cancelar
        </UButton>
        <UButton
          color="error"
          icon="i-lucide-trash-2"
          block
          class="cursor-pointer sm:w-auto"
          :loading="Boolean(deletingId)"
          @click="onDelete"
        >
          Eliminar
        </UButton>
      </div>
    </template>
  </UModal>
</template>
