<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type {
  AdminUserSummary,
  UserCustomerType,
  UserRole,
  UserStatus
} from '~~/types/types'
import {
  USER_CUSTOMER_TYPE_VALUES,
  USER_ROLE_VALUES,
  USER_STATUS_VALUES
} from '~~/types/types'
import { formatDate } from '~/utils/formatters'

definePageMeta({
  layout: 'admin',
  middleware: ['supabase-auth', 'admin-only']
})

useSeoMeta({
  title: 'Gestión de usuarios | Heltifud Meal Preps',
  description: 'Administra la base de usuarios del panel administrativo de Heltifud Meal Preps.',
  robots: 'noindex, nofollow'
})

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const summaryCardPlaceholders = [1, 2, 3]
const tableRowPlaceholders = [1, 2, 3, 4, 5]

const search = ref('')
const roleFilter = ref<'all' | UserRole>('all')
const statusFilter = ref<'all' | UserStatus>('all')
const customerTypeFilter = ref<'all' | UserCustomerType>('all')

const roleOptions = [
  { label: 'Todos los roles', value: 'all' },
  ...USER_ROLE_VALUES.map(role => ({
    label: formatRole(role),
    value: role
  }))
]

const statusOptions = [
  { label: 'Todos los estados', value: 'all' },
  ...USER_STATUS_VALUES.map(status => ({
    label: formatStatus(status),
    value: status
  }))
]

const customerTypeOptions = [
  { label: 'Todos los tipos', value: 'all' },
  ...USER_CUSTOMER_TYPE_VALUES.map(type => ({
    label: formatCustomerType(type),
    value: type
  }))
]

const {
  data: users,
  error,
  status
} = await useLazyFetch<AdminUserSummary[]>('/api/admin/users', {
  default: () => []
})

const isLoading = computed(() => status.value === 'pending')
const hasUsers = computed(() => users.value.length > 0)
const hasActiveFilters = computed(() =>
  Boolean(search.value.trim())
  || roleFilter.value !== 'all'
  || statusFilter.value !== 'all'
  || customerTypeFilter.value !== 'all'
)

const summaryCards = computed(() => [
  {
    key: 'active-users',
    title: 'Usuarios activos',
    description: `${countLabel(activeUsersCount.value, 'usuario activo', 'usuarios activos')} con acceso vigente al sistema.`,
    icon: 'i-lucide-badge-check',
    statIcon: 'i-lucide-shield-check',
    stat: `${activeUsersCount.value} de ${users.value.length}`,
    actionLabel: 'Filtrar',
    onAction: () => {
      search.value = ''
      roleFilter.value = 'all'
      statusFilter.value = 'ACTIVO'
      customerTypeFilter.value = 'all'
    }
  },
  {
    key: 'client-users',
    title: 'Clientes',
    description: `${countLabel(clientUsersCount.value, 'cliente registrado', 'clientes registrados')} en la base principal.`,
    icon: 'i-lucide-users-round',
    statIcon: 'i-lucide-shopping-bag',
    stat: formatRoleCount('CLIENTE', clientUsersCount.value),
    actionLabel: 'Filtrar',
    onAction: () => {
      search.value = ''
      roleFilter.value = 'CLIENTE'
      statusFilter.value = 'all'
      customerTypeFilter.value = 'all'
    }
  },
  {
    key: 'admin-users',
    title: 'Administradores',
    description: `${countLabel(adminUsersCount.value, 'admin con acceso', 'admins con acceso')} al panel administrativo.`,
    icon: 'i-lucide-user-cog',
    statIcon: 'i-lucide-shield',
    stat: formatRoleCount('ADMIN', adminUsersCount.value),
    actionLabel: 'Filtrar',
    onAction: () => {
      search.value = ''
      roleFilter.value = 'ADMIN'
      statusFilter.value = 'all'
      customerTypeFilter.value = 'all'
    }
  }
])

const filteredUsers = computed(() => {
  const normalizedSearch = normalizeText(search.value)

  return users.value.filter((user) => {
    const matchesSearch = !normalizedSearch
      || normalizeText([
        user.nombre,
        user.apellidos,
        user.email,
        user.telefono ?? ''
      ].join(' ')).includes(normalizedSearch)

    const matchesRole = roleFilter.value === 'all' || user.role === roleFilter.value
    const matchesStatus = statusFilter.value === 'all' || user.status === statusFilter.value
    const matchesCustomerType = customerTypeFilter.value === 'all' || user.customerType === customerTypeFilter.value

    return matchesSearch && matchesRole && matchesStatus && matchesCustomerType
  })
})

const activeUsersCount = computed(() =>
  users.value.filter(user => user.status === 'ACTIVO').length
)
const clientUsersCount = computed(() =>
  users.value.filter(user => user.role === 'CLIENTE').length
)
const adminUsersCount = computed(() =>
  users.value.filter(user => user.role === 'ADMIN').length
)

const columns: TableColumn<AdminUserSummary>[] = [
  {
    accessorKey: 'usuario',
    header: 'Usuario',
    cell: ({ row }) => h('div', { class: 'space-y-1 py-1' }, [
      h('p', { class: 'font-medium text-highlighted' }, fullName(row.original)),
      h('p', { class: 'text-sm text-muted' }, row.original.email)
    ])
  },
  {
    accessorKey: 'role',
    header: 'Rol',
    cell: ({ row }) => h(UBadge, {
      color: row.original.role === 'ADMIN' ? 'primary' : 'neutral',
      variant: 'subtle'
    }, () => formatRole(row.original.role))
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => h(UBadge, {
      color: statusColorMap[row.original.status],
      variant: 'subtle'
    }, () => formatStatus(row.original.status))
  },
  {
    accessorKey: 'customerType',
    header: 'Tipo',
    cell: ({ row }) => h('span', { class: 'text-sm text-toned' }, formatCustomerType(row.original.customerType))
  },
  {
    accessorKey: 'telefono',
    header: 'Teléfono',
    cell: ({ row }) => h('span', { class: 'text-sm text-toned' }, row.original.telefono || 'Sin teléfono')
  },
  {
    accessorKey: 'ordersCountCached',
    header: () => h('div', { class: 'text-right' }, 'Órdenes'),
    cell: ({ row }) => h('div', { class: 'text-right text-toned' }, row.original.ordersCountCached)
  },
  {
    accessorKey: 'lastOrderAt',
    header: 'Último pedido',
    cell: ({ row }) => h('span', { class: 'text-sm text-toned' }, formatLastOrder(row.original.lastOrderAt))
  },
  {
    accessorKey: 'totalSpentCached',
    header: () => h('div', { class: 'text-right' }, 'Gasto total'),
    cell: ({ row }) => h('div', { class: 'text-right text-toned' }, formatCurrency(row.original.totalSpentCached))
  },
  {
    id: 'edit',
    header: () => h('div', { class: 'text-center' }, 'Editar'),
    cell: ({ row }) =>
      h('div', { class: 'flex justify-center' }, [
        h(UButton, {
          'to': `/usuarios/${row.original.id}`,
          'color': 'primary',
          'variant': 'ghost',
          'icon': 'i-lucide-square-pen',
          'aria-label': `Editar ${fullName(row.original)}`
        })
      ])
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

function formatRoleCount(role: UserRole, count: number) {
  return role === 'ADMIN'
    ? countLabel(count, 'administrador', 'administradores')
    : countLabel(count, 'cliente', 'clientes')
}

function fullName(user: Pick<AdminUserSummary, 'nombre' | 'apellidos' | 'email'>) {
  const label = `${user.nombre} ${user.apellidos}`.trim()
  return label || user.email
}

function formatRole(role: UserRole) {
  return role === 'ADMIN' ? 'Administrador' : 'Cliente'
}

function formatStatus(status: UserStatus) {
  return {
    ACTIVO: 'Activo',
    PAUSADO: 'Pausado',
    INACTIVO: 'Inactivo',
    BLOQUEADO: 'Bloqueado'
  }[status]
}

function formatCustomerType(type: UserCustomerType | null) {
  if (!type) {
    return 'Sin tipo'
  }

  return {
    VEGETARIANO: 'Vegetariano',
    NUTRIOLOGO: 'Nutriólogo',
    ESTANDAR: 'Estándar'
  }[type]
}

function formatLastOrder(value: string | null) {
  return value ? formatDate(value) : 'Sin pedidos'
}

function formatCurrency(value: number | null) {
  if (value === null) {
    return 'Sin gasto'
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2
  }).format(value)
}

function clearFilters() {
  search.value = ''
  roleFilter.value = 'all'
  statusFilter.value = 'all'
  customerTypeFilter.value = 'all'
}

const statusColorMap: Record<UserStatus, 'primary' | 'success' | 'warning' | 'neutral' | 'error'> = {
  ACTIVO: 'success',
  PAUSADO: 'warning',
  INACTIVO: 'neutral',
  BLOQUEADO: 'error'
}
</script>

<template>
  <main class="flex min-h-full flex-col space-y-6">
    <section class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="space-y-2">
        <div class="space-y-1">
          <h1 class="text-3xl font-semibold tracking-tight text-primary">
            Usuarios
          </h1>
          <p class="max-w-2xl text-sm text-muted">
            Consulta la base de clientes y administradores, filtra por estado o tipo
            y detecta rápidamente actividad comercial reciente.
          </p>
        </div>
      </div>

      <div class="flex w-full items-center gap-3 lg:w-auto lg:justify-end">
        <UButton
          to="/usuarios/crear-nuevo"
          icon="i-lucide-plus"
          class="w-full justify-center lg:w-auto"
          size="lg"
        >
          Nuevo usuario
        </UButton>
      </div>
    </section>

    <section class="space-y-4">
      <section class="grid gap-3 lg:grid-cols-3">
        <template v-if="isLoading">
          <UCard
            v-for="placeholder in summaryCardPlaceholders"
            :key="`summary-skeleton-${placeholder}`"
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
            <div
              class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20"
            >
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
        title="No se pudieron cargar los usuarios"
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
                Directorio de usuarios
              </h2>
              <p class="text-sm text-muted">
                {{ filteredUsers.length }} {{ filteredUsers.length === 1 ? 'resultado' : 'resultados' }}
                sobre {{ users.length }} {{ users.length === 1 ? 'registro' : 'registros' }}.
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

          <div class="grid gap-3 lg:grid-cols-[minmax(0,1.8fr)_repeat(3,minmax(0,0.8fr))]">
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Buscar por nombre, email o teléfono"
              size="lg"
            />

            <USelect
              v-model="roleFilter"
              :items="roleOptions"
              size="lg"
              placeholder="Rol"
            />

            <USelect
              v-model="statusFilter"
              :items="statusOptions"
              size="lg"
              placeholder="Estado"
            />

            <USelect
              v-model="customerTypeFilter"
              :items="customerTypeOptions"
              size="lg"
              placeholder="Tipo"
            />
          </div>

          <UAlert
            v-if="!isLoading && !hasUsers"
            title="Aún no hay usuarios"
            description="Cuando empiecen a registrarse clientes o admins, aparecerán listados aquí."
            color="neutral"
            variant="soft"
            icon="i-lucide-users"
          />

          <UAlert
            v-else-if="!isLoading && !filteredUsers.length"
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
              :data="filteredUsers"
              :columns="columns"
              class="shrink-0"
              :ui="{
                base: 'min-w-[1080px] table-fixed border-separate border-spacing-0',
                thead: '[&>tr]:bg-default [&>tr]:after:content-none',
                tbody: '[&>tr]:last:[&>td]:border-b-0',
                th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
                td: 'border-b border-default align-top'
              }"
            />
          </div>

          <div v-else class="overflow-hidden rounded-xl border border-default/70">
            <div class="grid min-w-[1080px] grid-cols-[minmax(0,1.7fr)_0.7fr_0.8fr_0.8fr_0.8fr_0.6fr_0.9fr_0.9fr_auto] gap-4 border-b border-default/70 bg-default px-4 py-3">
              <div class="h-4 w-20 animate-pulse rounded-md bg-default/70" />
              <div class="h-4 w-14 animate-pulse rounded-md bg-default/70" />
              <div class="h-4 w-16 animate-pulse rounded-md bg-default/70" />
              <div class="h-4 w-14 animate-pulse rounded-md bg-default/70" />
              <div class="h-4 w-18 animate-pulse rounded-md bg-default/70" />
              <div class="h-4 w-16 animate-pulse rounded-md bg-default/70" />
              <div class="h-4 w-20 animate-pulse rounded-md bg-default/70" />
              <div class="ml-auto h-4 w-20 animate-pulse rounded-md bg-default/70" />
              <div class="ml-auto h-4 w-16 animate-pulse rounded-md bg-default/70" />
            </div>

            <div
              v-for="placeholder in tableRowPlaceholders"
              :key="`row-skeleton-${placeholder}`"
              class="grid min-w-[1080px] grid-cols-[minmax(0,1.7fr)_0.7fr_0.8fr_0.8fr_0.8fr_0.6fr_0.9fr_0.9fr_auto] gap-4 border-b border-default/70 px-4 py-4 last:border-b-0"
            >
              <div class="space-y-2">
                <div class="h-4 w-36 animate-pulse rounded-md bg-elevated" />
                <div class="h-4 w-44 animate-pulse rounded-md bg-elevated" />
              </div>
              <div class="h-6 w-24 animate-pulse rounded-full bg-elevated" />
              <div class="h-6 w-24 animate-pulse rounded-full bg-elevated" />
              <div class="h-4 w-20 animate-pulse rounded-md bg-elevated" />
              <div class="h-4 w-24 animate-pulse rounded-md bg-elevated" />
              <div class="ml-auto h-4 w-10 animate-pulse rounded-md bg-elevated" />
              <div class="h-4 w-20 animate-pulse rounded-md bg-elevated" />
              <div class="ml-auto h-4 w-24 animate-pulse rounded-md bg-elevated" />
              <div class="ml-auto h-8 w-8 animate-pulse rounded-lg bg-elevated" />
            </div>
          </div>
        </div>
      </UCard>
    </section>
  </main>
</template>
