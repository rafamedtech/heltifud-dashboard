<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type {
  AdminOrderActorSummary,
  AdminOrderSummary,
  OrderPaymentStatus,
  OrderPlanResolutionStatus,
  OrderStatus,
  PlanType
} from '~~/types/types'
import {
  ORDER_PAYMENT_STATUS_VALUES,
  ORDER_STATUS_VALUES
} from '~~/types/types'
import { formatDateTime, formatWeekRange } from '~/utils/formatters'

definePageMeta({
  layout: 'admin',
  middleware: ['supabase-auth']
})

useSeoMeta({
  title: 'Gestión de pedidos | Heltifud Meal Preps',
  description: 'Monitorea el pipeline de pedidos, su avance de surtido y el estado de cobro dentro del panel administrativo de Heltifud Meal Preps.',
  robots: 'noindex, nofollow'
})

type BadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
type FulfillmentFilter = 'all' | 'pending' | 'resolved'
type DeliveryFilter = 'all' | 'scheduled' | 'unscheduled'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const summaryCardPlaceholders = [1, 2, 3]
const tableRowPlaceholders = [1, 2, 3, 4, 5]

const search = ref('')
const statusFilter = ref<'all' | OrderStatus>('all')
const paymentStatusFilter = ref<'all' | OrderPaymentStatus>('all')
const fulfillmentFilter = ref<FulfillmentFilter>('all')
const deliveryFilter = ref<DeliveryFilter>('all')

const statusOptions = [
  { label: 'Todos los estados', value: 'all' },
  ...ORDER_STATUS_VALUES.map(value => ({
    label: formatOrderStatus(value),
    value
  }))
]

const paymentStatusOptions = [
  { label: 'Todos los cobros', value: 'all' },
  ...ORDER_PAYMENT_STATUS_VALUES.map(value => ({
    label: formatPaymentStatus(value),
    value
  }))
]

const fulfillmentOptions = [
  { label: 'Todo el surtido', value: 'all' },
  { label: 'Con pendientes', value: 'pending' },
  { label: 'Resueltos', value: 'resolved' }
]

const deliveryOptions = [
  { label: 'Todas las entregas', value: 'all' },
  { label: 'Programadas', value: 'scheduled' },
  { label: 'Sin fecha', value: 'unscheduled' }
]

const {
  data: orders,
  error,
  refresh,
  status: fetchStatus
} = await useLazyFetch<AdminOrderSummary[]>('/api/admin/orders', {
  default: () => []
})

const isLoading = computed(() => fetchStatus.value === 'pending')
const hasOrders = computed(() => orders.value.length > 0)
const hasActiveFilters = computed(() =>
  Boolean(search.value.trim())
  || statusFilter.value !== 'all'
  || paymentStatusFilter.value !== 'all'
  || fulfillmentFilter.value !== 'all'
  || deliveryFilter.value !== 'all'
)

const filteredOrders = computed(() => {
  const normalizedSearch = normalizeText(search.value)

  return orders.value.filter((order) => {
    const matchesSearch = !normalizedSearch
      || normalizeText([
        order.orderNumber ?? '',
        fullName(order.user),
        order.user.email,
        order.user.telefono ?? '',
        order.menuNameSnapshot,
        order.weeklyMenu?.name ?? '',
        order.tags.join(' '),
        order.notas,
        order.notasInternas,
        order.planItems.map(plan => plan.planName).join(' ')
      ].join(' ')).includes(normalizedSearch)

    const matchesStatus = statusFilter.value === 'all' || order.status === statusFilter.value
    const matchesPayment = paymentStatusFilter.value === 'all' || order.paymentStatus === paymentStatusFilter.value
    const matchesFulfillment = fulfillmentFilter.value === 'all'
      || (fulfillmentFilter.value === 'pending'
        ? order.totalPendingDishCount > 0
        : order.totalRequestedDishCount > 0 && order.totalPendingDishCount === 0)
    const matchesDelivery = deliveryFilter.value === 'all'
      || (deliveryFilter.value === 'scheduled' ? hasScheduledDelivery(order) : !hasScheduledDelivery(order))

    return matchesSearch && matchesStatus && matchesPayment && matchesFulfillment && matchesDelivery
  })
})

const pendingResolutionOrdersCount = computed(() =>
  orders.value.filter(order => !isCancelled(order) && order.totalPendingDishCount > 0).length
)
const pendingDishCount = computed(() =>
  orders.value.reduce((sum, order) => sum + (isCancelled(order) ? 0 : order.totalPendingDishCount), 0)
)
const scheduledOrdersCount = computed(() =>
  orders.value.filter(order => !isCancelled(order) && hasScheduledDelivery(order)).length
)
const pendingCollectionTotal = computed(() =>
  orders.value.reduce((sum, order) => {
    if (isCancelled(order) || order.paymentStatus !== 'PENDIENTE') {
      return sum
    }

    return sum + (order.total ?? 0)
  }, 0)
)

const summaryCards = computed(() => [
  {
    key: 'pending-resolution',
    title: 'Pedidos por surtir',
    description: 'Órdenes con platillos aún pendientes de asignar o cerrar contra el menú resuelto.',
    icon: 'i-lucide-package-search',
    statIcon: 'i-lucide-utensils-crossed',
    stat: `${pendingDishCount.value} ${pendingDishCount.value === 1 ? 'platillo pendiente' : 'platillos pendientes'}`,
    actionLabel: 'Filtrar',
    onAction: () => {
      search.value = ''
      statusFilter.value = 'all'
      paymentStatusFilter.value = 'all'
      fulfillmentFilter.value = 'pending'
      deliveryFilter.value = 'all'
    }
  },
  {
    key: 'scheduled',
    title: 'Entregas programadas',
    description: 'Pedidos con fecha capturada para surtido, ruta o entrega al cliente.',
    icon: 'i-lucide-truck',
    statIcon: 'i-lucide-calendar-clock',
    stat: countLabel(scheduledOrdersCount.value, 'entrega programada', 'entregas programadas'),
    actionLabel: 'Filtrar',
    onAction: () => {
      search.value = ''
      statusFilter.value = 'all'
      paymentStatusFilter.value = 'all'
      fulfillmentFilter.value = 'all'
      deliveryFilter.value = 'scheduled'
    }
  },
  {
    key: 'pending-payment',
    title: 'Cobro pendiente',
    description: 'Monto total en órdenes activas que aún no cambian a estatus de pago confirmado.',
    icon: 'i-lucide-wallet',
    statIcon: 'i-lucide-badge-dollar-sign',
    stat: formatCurrency(pendingCollectionTotal.value, 'MXN', 'Sin cobro pendiente'),
    actionLabel: 'Filtrar',
    onAction: () => {
      search.value = ''
      statusFilter.value = 'all'
      paymentStatusFilter.value = 'PENDIENTE'
      fulfillmentFilter.value = 'all'
      deliveryFilter.value = 'all'
    }
  }
])

const columns: TableColumn<AdminOrderSummary>[] = [
  {
    id: 'pedido',
    header: 'Pedido',
    cell: ({ row }) => {
      const tags = row.original.tags.slice(0, 2).map(tag =>
        h(UBadge, {
          color: 'neutral',
          variant: 'subtle',
          size: 'sm'
        }, () => tag)
      )

      return h('div', { class: 'space-y-2 py-1' }, [
        h('div', { class: 'space-y-1' }, [
          h('p', { class: 'font-medium text-highlighted' }, formatOrderLabel(row.original)),
          h('p', { class: 'text-sm text-muted' }, `Capturado ${formatDateTime(row.original.createdAt)}`)
        ]),
        tags.length
          ? h('div', { class: 'flex flex-wrap gap-1.5' }, tags)
          : h('p', { class: 'text-xs text-muted' }, `Creó ${fullName(row.original.createdBy)}`)
      ])
    }
  },
  {
    id: 'cliente',
    header: 'Cliente',
    cell: ({ row }) => h('div', { class: 'space-y-1 py-1' }, [
      h('p', { class: 'font-medium text-highlighted' }, fullName(row.original.user)),
      h('p', { class: 'text-sm text-muted' }, row.original.user.email),
      h('p', { class: 'text-xs text-muted' }, row.original.user.telefono || 'Sin teléfono registrado')
    ])
  },
  {
    id: 'menu',
    header: 'Menú y entrega',
    cell: ({ row }) => h('div', { class: 'space-y-1.5 py-1' }, [
      h('p', { class: 'font-medium text-highlighted' }, menuLabel(row.original)),
      h('p', { class: 'text-sm text-muted' }, menuRangeLabel(row.original)),
      h('p', { class: 'text-xs text-muted' }, deliverySummary(row.original)),
      h('p', { class: 'text-xs text-muted line-clamp-2' }, row.original.deliveryAddressSummary || 'Sin domicilio capturado')
    ])
  },
  {
    id: 'planes',
    header: 'Planes',
    cell: ({ row }) => {
      const planChildren = row.original.planItems.slice(0, 2).map(planItem =>
        h('div', { class: 'rounded-xl border border-default/70 bg-default/60 p-2.5' }, [
          h('div', { class: 'flex items-start justify-between gap-2' }, [
            h('div', { class: 'min-w-0 space-y-1' }, [
              h('p', { class: 'truncate text-sm font-medium text-highlighted' }, `${planItem.quantity}x ${planItem.planName}`),
              h('p', { class: 'text-xs text-muted' }, `${formatPlanType(planItem.planTypeSnapshot)} · ${planItem.requestedDishCount} platillos`)
            ]),
            h(UBadge, {
              color: resolutionColorMap[planItem.resolutionStatus],
              variant: 'subtle',
              size: 'sm'
            }, () => formatResolutionStatus(planItem.resolutionStatus))
          ]),
          h('p', { class: 'mt-1 text-xs text-muted' }, formatCurrency(planItem.lineSubtotal, row.original.currency, 'Subtotal pendiente'))
        ])
      )

      if (!planChildren.length) {
        return h('p', { class: 'py-1 text-sm text-muted' }, 'Sin planes ligados')
      }

      if (row.original.planItems.length > 2) {
        planChildren.push(
          h('p', { class: 'px-1 text-xs text-muted' }, `+${row.original.planItems.length - 2} plan${row.original.planItems.length - 2 === 1 ? '' : 'es'} más`)
        )
      }

      return h('div', { class: 'space-y-2 py-1' }, planChildren)
    }
  },
  {
    id: 'surtido',
    header: 'Surtido',
    cell: ({ row }) => h('div', { class: 'space-y-2 py-1' }, [
      h('div', { class: 'flex items-center justify-between gap-3 text-sm' }, [
        h('span', { class: 'font-medium text-highlighted' }, `${row.original.totalAssignedDishCount}/${row.original.totalRequestedDishCount} asignados`),
        h('span', { class: 'text-muted' }, `${row.original.totalPendingDishCount} pendientes`)
      ]),
      h('div', { class: 'h-2 overflow-hidden rounded-full bg-elevated' }, [
        h('div', {
          class: 'h-full rounded-full bg-primary transition-all',
          style: { width: `${completionWidth(row.original)}%` }
        })
      ]),
      h('div', { class: 'flex items-center justify-between gap-3 text-xs text-muted' }, [
        h('span', {}, `${row.original.totalDishCountCached} platillos base`),
        h('span', {}, bagCountLabel(row.original.requiredBagCountCached))
      ])
    ])
  },
  {
    id: 'pago',
    header: 'Cobro',
    cell: ({ row }) => h('div', { class: 'space-y-2 py-1' }, [
      h(UBadge, {
        color: paymentColorMap[row.original.paymentStatus],
        variant: 'subtle',
        size: 'sm'
      }, () => formatPaymentStatus(row.original.paymentStatus)),
      h('p', { class: 'font-medium text-highlighted' }, formatCurrency(row.original.total, row.original.currency, 'Sin total calculado')),
      h('p', { class: 'text-xs text-muted' }, `Subtotal ${formatCurrency(row.original.subtotal, row.original.currency, 'pendiente')}`),
      h('p', { class: 'text-xs text-muted' }, `Envío ${formatCurrency(row.original.costoEnvio, row.original.currency, 'sin captura')}`)
    ])
  },
  {
    id: 'estado',
    header: 'Estado',
    cell: ({ row }) => h('div', { class: 'space-y-2 py-1' }, [
      h(UBadge, {
        color: statusColorMap[row.original.status],
        variant: 'subtle',
        size: 'sm'
      }, () => formatOrderStatus(row.original.status)),
      h('p', { class: 'text-xs text-muted' }, statusMetaLabel(row.original)),
      row.original.menuResolvedAt
        ? h('p', { class: 'text-xs text-muted' }, `Menú resuelto ${formatDateTime(row.original.menuResolvedAt)}`)
        : h('p', { class: 'text-xs text-muted' }, pendingResolutionLabel(row.original))
    ])
  },
  {
    id: 'actions',
    header: () => h('div', { class: 'text-center' }, 'Acciones'),
    cell: ({ row }) => {
      const actions = [
        h(UButton, {
          'to': `/usuarios/${row.original.user.id}`,
          'color': 'primary',
          'variant': 'ghost',
          'icon': 'i-lucide-user-round',
          'aria-label': `Ver cliente ${fullName(row.original.user)}`
        })
      ]

      if (row.original.weeklyMenu) {
        actions.push(
          h(UButton, {
            'to': `/menu/${row.original.weeklyMenu.id}`,
            'color': 'neutral',
            'variant': 'ghost',
            'icon': 'i-lucide-calendar-range',
            'aria-label': `Ver menú ${row.original.weeklyMenu.name}`
          })
        )
      }

      return h('div', { class: 'flex justify-center gap-1' }, actions)
    }
  }
]

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

function fullName(actor: AdminOrderActorSummary) {
  const label = `${actor.nombre} ${actor.apellidos}`.trim()
  return label || actor.email
}

function formatOrderLabel(order: AdminOrderSummary) {
  return order.orderNumber ? `Pedido ${order.orderNumber}` : `Pedido ${order.id.slice(0, 8)}`
}

function formatOrderStatus(status: OrderStatus) {
  return {
    BORRADOR: 'Borrador',
    INGRESADO: 'Ingresado',
    CONFIRMADO: 'Confirmado',
    PAGADO: 'Pagado',
    EMPACADO: 'Empacado',
    EMPACADO_POR_PAGAR: 'Empacado por pagar',
    PROGRAMADO: 'Programado',
    EN_RUTA: 'En ruta',
    ENTREGADO: 'Entregado',
    ENTREGADO_POR_PAGAR: 'Entregado por pagar',
    COMPLETADO: 'Completado',
    COMPLETADO_POR_PAGAR: 'Completado por pagar',
    CANCELADO: 'Cancelado'
  }[status]
}

function formatPaymentStatus(status: OrderPaymentStatus) {
  return {
    PENDIENTE: 'Pendiente',
    PAGADO: 'Pagado',
    FALLIDO: 'Fallido',
    REEMBOLSADO: 'Reembolsado'
  }[status]
}

function formatResolutionStatus(status: OrderPlanResolutionStatus) {
  return {
    PENDIENTE: 'Pendiente',
    PARCIAL: 'Parcial',
    COMPLETO: 'Completo'
  }[status]
}

function formatPlanType(type: PlanType) {
  return {
    DESAYUNO: 'Desayuno',
    COMIDA: 'Comida',
    CENA: 'Cena'
  }[type]
}

function formatCurrency(value: number | null, currency = 'MXN', fallback = 'Sin monto') {
  if (value === null) {
    return fallback
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(value)
}

function hasScheduledDelivery(order: AdminOrderSummary) {
  return Boolean(order.scheduledFor || order.firstDeliveryAt || order.secondDeliveryAt)
}

function isCancelled(order: AdminOrderSummary) {
  return order.status === 'CANCELADO'
}

function menuLabel(order: AdminOrderSummary) {
  return order.menuNameSnapshot || order.weeklyMenu?.name || 'Sin menú vinculado'
}

function menuRangeLabel(order: AdminOrderSummary) {
  if (order.menuStartDateSnapshot && order.menuEndDateSnapshot) {
    return formatWeekRange(order.menuStartDateSnapshot, order.menuEndDateSnapshot)
  }

  if (order.weeklyMenu) {
    return formatWeekRange(order.weeklyMenu.startDate, order.weeklyMenu.endDate)
  }

  return 'Rango de menú pendiente'
}

function deliverySummary(order: AdminOrderSummary) {
  const dates = [
    order.scheduledFor ? `Programado ${formatDateTime(order.scheduledFor)}` : null,
    order.firstDeliveryAt ? `Primera entrega ${formatDateTime(order.firstDeliveryAt)}` : null,
    order.secondDeliveryAt ? `Segunda entrega ${formatDateTime(order.secondDeliveryAt)}` : null
  ].filter(Boolean)

  return dates[0] || 'Sin fecha de entrega'
}

function bagCountLabel(value: number | null) {
  if (value === null) {
    return 'Bolsas por definir'
  }

  return `${value} ${value === 1 ? 'bolsa' : 'bolsas'}`
}

function completionWidth(order: AdminOrderSummary) {
  if (order.totalRequestedDishCount <= 0) {
    return 0
  }

  return Math.max(0, Math.min(100, Math.round((order.totalAssignedDishCount / order.totalRequestedDishCount) * 100)))
}

function statusMetaLabel(order: AdminOrderSummary) {
  if (order.cancelledAt) {
    return `Cancelado ${formatDateTime(order.cancelledAt)}`
  }

  if (order.deliveredAt) {
    return `Entregado ${formatDateTime(order.deliveredAt)}`
  }

  return `Actualizado ${formatDateTime(order.updatedAt)}`
}

function pendingResolutionLabel(order: AdminOrderSummary) {
  if (order.totalPendingDishCount > 0) {
    return `${order.totalPendingDishCount} platillos siguen pendientes`
  }

  if (order.totalRequestedDishCount > 0) {
    return 'Surtido completo'
  }

  return 'Sin avance de surtido'
}

function clearFilters() {
  search.value = ''
  statusFilter.value = 'all'
  paymentStatusFilter.value = 'all'
  fulfillmentFilter.value = 'all'
  deliveryFilter.value = 'all'
}

const statusColorMap: Record<OrderStatus, BadgeColor> = {
  BORRADOR: 'neutral',
  INGRESADO: 'primary',
  CONFIRMADO: 'info',
  PAGADO: 'success',
  EMPACADO: 'primary',
  EMPACADO_POR_PAGAR: 'warning',
  PROGRAMADO: 'secondary',
  EN_RUTA: 'primary',
  ENTREGADO: 'success',
  ENTREGADO_POR_PAGAR: 'warning',
  COMPLETADO: 'success',
  COMPLETADO_POR_PAGAR: 'warning',
  CANCELADO: 'error'
}

const paymentColorMap: Record<OrderPaymentStatus, BadgeColor> = {
  PENDIENTE: 'warning',
  PAGADO: 'success',
  FALLIDO: 'error',
  REEMBOLSADO: 'neutral'
}

const resolutionColorMap: Record<OrderPlanResolutionStatus, BadgeColor> = {
  PENDIENTE: 'warning',
  PARCIAL: 'primary',
  COMPLETO: 'success'
}
</script>

<template>
  <main class="flex min-h-full flex-col space-y-6">
    <section class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="space-y-2">
        <div class="space-y-1">
          <h1 class="text-3xl font-semibold tracking-tight text-primary">
            Pedidos
          </h1>
          <p class="max-w-3xl text-sm text-muted">
            Supervisa el pipeline completo de órdenes, el avance real de surtido por plan
            y el estado de cobro usando los nuevos snapshots del menú resuelto.
          </p>
        </div>
      </div>

      <div class="flex w-full items-center gap-3 lg:w-auto lg:justify-end">
        <UButton
          to="/pedidos/crear-nuevo"
          icon="i-lucide-plus"
          class="w-full justify-center lg:w-auto"
          size="lg"
        >
          Nuevo pedido
        </UButton>

        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-refresh-cw"
          class="w-full justify-center lg:w-auto"
          :loading="isLoading"
          @click="refresh"
        >
          Recargar
        </UButton>
      </div>
    </section>

    <section class="space-y-4">
      <section class="grid gap-3 lg:grid-cols-3">
        <template v-if="isLoading">
          <UCard
            v-for="placeholder in summaryCardPlaceholders"
            :key="`order-summary-skeleton-${placeholder}`"
            :ui="{
              root: 'overflow-hidden rounded-2xl border border-default/70 ring-0 divide-y-0 bg-elevated/35 shadow-sm shadow-black/5',
              body: 'flex min-h-[176px] flex-col p-4 sm:p-4.5'
            }"
          >
            <div class="size-9 animate-pulse rounded-lg bg-elevated" />
            <div class="mt-4 space-y-2">
              <div class="h-5 w-32 animate-pulse rounded-md bg-elevated" />
              <div class="h-4 w-full animate-pulse rounded-md bg-elevated" />
              <div class="h-4 w-4/5 animate-pulse rounded-md bg-elevated" />
            </div>
            <div class="mt-auto pt-5">
              <div class="border-t border-default/70 pt-3">
                <div class="flex items-center justify-between gap-3">
                  <div class="h-4 w-28 animate-pulse rounded-md bg-elevated" />
                  <div class="h-8 w-20 animate-pulse rounded-lg bg-elevated" />
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
                    size="sm"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-filter"
                    :ui="{ base: 'rounded-lg px-2.5 text-muted hover:text-highlighted' }"
                    @click="card.onAction"
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
        title="No se pudieron cargar los pedidos"
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
                Pipeline de pedidos
              </h2>
              <p class="text-sm text-muted">
                {{ filteredOrders.length }} {{ filteredOrders.length === 1 ? 'resultado' : 'resultados' }}
                sobre {{ orders.length }} {{ orders.length === 1 ? 'pedido' : 'pedidos' }}.
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

          <div class="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_repeat(4,minmax(0,0.78fr))]">
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Buscar por folio, cliente, menú, plan o notas"
              size="lg"
            />

            <USelect
              v-model="statusFilter"
              :items="statusOptions"
              size="lg"
              placeholder="Estado"
            />

            <USelect
              v-model="paymentStatusFilter"
              :items="paymentStatusOptions"
              size="lg"
              placeholder="Cobro"
            />

            <USelect
              v-model="fulfillmentFilter"
              :items="fulfillmentOptions"
              size="lg"
              placeholder="Surtido"
            />

            <USelect
              v-model="deliveryFilter"
              :items="deliveryOptions"
              size="lg"
              placeholder="Entrega"
            />
          </div>

          <UAlert
            v-if="!isLoading && !hasOrders"
            title="Aún no hay pedidos"
            description="Cuando entren órdenes nuevas aparecerán aquí con su avance de surtido y cobro."
            color="neutral"
            variant="soft"
            icon="i-lucide-shopping-bag"
          />

          <UAlert
            v-else-if="!isLoading && !filteredOrders.length"
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
              :data="filteredOrders"
              :columns="columns"
              class="shrink-0"
              :ui="{
                base: 'min-w-[1540px] table-fixed border-separate border-spacing-0',
                thead: '[&>tr]:bg-default [&>tr]:after:content-none',
                tbody: '[&>tr]:last:[&>td]:border-b-0',
                th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r align-top',
                td: 'border-b border-default align-top'
              }"
            />
          </div>

          <div v-else class="overflow-hidden rounded-xl border border-default/70">
            <div class="grid min-w-[1540px] grid-cols-[0.95fr_1fr_1.15fr_1.2fr_0.9fr_0.8fr_0.8fr_auto] gap-4 border-b border-default/70 bg-default px-4 py-3">
              <div
                v-for="placeholder in 8"
                :key="`order-header-skeleton-${placeholder}`"
                class="h-4 w-24 animate-pulse rounded-md bg-default/70"
              />
            </div>

            <div
              v-for="placeholder in tableRowPlaceholders"
              :key="`order-row-skeleton-${placeholder}`"
              class="grid min-w-[1540px] grid-cols-[0.95fr_1fr_1.15fr_1.2fr_0.9fr_0.8fr_0.8fr_auto] gap-4 border-b border-default/70 px-4 py-4 last:border-b-0"
            >
              <div class="space-y-2">
                <div class="h-4 w-32 animate-pulse rounded-md bg-elevated" />
                <div class="h-4 w-28 animate-pulse rounded-md bg-elevated" />
              </div>
              <div class="space-y-2">
                <div class="h-4 w-40 animate-pulse rounded-md bg-elevated" />
                <div class="h-4 w-44 animate-pulse rounded-md bg-elevated" />
              </div>
              <div class="space-y-2">
                <div class="h-4 w-32 animate-pulse rounded-md bg-elevated" />
                <div class="h-4 w-48 animate-pulse rounded-md bg-elevated" />
                <div class="h-4 w-40 animate-pulse rounded-md bg-elevated" />
              </div>
              <div class="space-y-2">
                <div class="h-16 animate-pulse rounded-xl bg-elevated" />
                <div class="h-16 animate-pulse rounded-xl bg-elevated" />
              </div>
              <div class="space-y-2">
                <div class="h-4 w-28 animate-pulse rounded-md bg-elevated" />
                <div class="h-2 w-full animate-pulse rounded-full bg-elevated" />
                <div class="h-4 w-24 animate-pulse rounded-md bg-elevated" />
              </div>
              <div class="space-y-2">
                <div class="h-6 w-24 animate-pulse rounded-full bg-elevated" />
                <div class="h-4 w-24 animate-pulse rounded-md bg-elevated" />
                <div class="h-4 w-20 animate-pulse rounded-md bg-elevated" />
              </div>
              <div class="space-y-2">
                <div class="h-6 w-28 animate-pulse rounded-full bg-elevated" />
                <div class="h-4 w-32 animate-pulse rounded-md bg-elevated" />
              </div>
              <div class="flex justify-center gap-2">
                <div class="size-8 animate-pulse rounded-lg bg-elevated" />
                <div class="size-8 animate-pulse rounded-lg bg-elevated" />
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </section>

    <UAlert
      v-if="!isLoading && pendingResolutionOrdersCount > 0"
      color="warning"
      variant="soft"
      icon="i-lucide-triangle-alert"
      :title="`${pendingResolutionOrdersCount} ${pendingResolutionOrdersCount === 1 ? 'pedido requiere seguimiento' : 'pedidos requieren seguimiento'}`"
      :description="`Todavía hay ${pendingDishCount} ${pendingDishCount === 1 ? 'platillo pendiente' : 'platillos pendientes'} por resolver en el surtido.`"
    />
  </main>
</template>
