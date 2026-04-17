<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { FoodCatalogItem } from '~~/types/types'
import { formatDate } from '~/utils/formatters'

const props = defineProps<{
  items: FoodCatalogItem[]
  loading?: boolean
  editTo: (item: FoodCatalogItem) => unknown
}>()

const search = ref('')
const typeFilter = ref('all')
const sortColumn = ref<'nombre' | 'tipo' | 'calorias' | 'updatedAt'>('updatedAt')
const sortDirection = ref<'asc' | 'desc'>('desc')
const page = ref(1)
const pageSize = 10

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const foodTypeOptions = [
  'Desayuno',
  'Comida',
  'Cena',
  'Guarnición',
  'Snack',
  'Ramekin'
]

function formatFoodType(type: string) {
  if (!type) {
    return type
  }

  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
}

const availableTypes = computed(() => {
  const normalizedTypes = props.items
    .map(item => formatFoodType(item.tipo))
    .filter(Boolean)

  return Array.from(new Set([...foodTypeOptions, ...normalizedTypes])).sort((a, b) => a.localeCompare(b, 'es'))
})

function toggleSort(column: 'nombre' | 'tipo' | 'calorias' | 'updatedAt') {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }

  sortColumn.value = column
  sortDirection.value = column === 'updatedAt' ? 'desc' : 'asc'
}

function getSortIcon(column: 'nombre' | 'tipo' | 'calorias' | 'updatedAt') {
  if (sortColumn.value !== column) {
    return 'i-lucide-arrow-up-down'
  }

  return sortDirection.value === 'asc'
    ? 'i-lucide-arrow-up'
    : 'i-lucide-arrow-down'
}

function compareItems(a: FoodCatalogItem, b: FoodCatalogItem) {
  const direction = sortDirection.value === 'asc' ? 1 : -1

  switch (sortColumn.value) {
    case 'nombre':
      return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }) * direction
    case 'tipo':
      return formatFoodType(a.tipo).localeCompare(formatFoodType(b.tipo), 'es', { sensitivity: 'base' }) * direction
    case 'calorias':
      return ((a.calorias ?? 0) - (b.calorias ?? 0)) * direction
    case 'updatedAt':
    default:
      return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * direction
  }
}

function renderSortableHeader(
  label: string,
  column: 'nombre' | 'tipo' | 'calorias' | 'updatedAt',
  options?: { align?: 'left' | 'center' | 'right' }
) {
  const justifyClass = options?.align === 'right'
    ? 'justify-end'
    : options?.align === 'center'
      ? 'justify-center'
      : 'justify-start'

  return h('div', { class: `flex ${justifyClass}` }, [
    h(UButton, {
      color: 'neutral',
      variant: 'ghost',
      size: 'sm',
      label,
      trailingIcon: getSortIcon(column),
      class: options?.align === 'right' ? 'px-0 text-right' : 'px-0',
      ui: {
        base: `-mx-2 gap-1.5 ${justifyClass}`,
        label: 'font-semibold text-highlighted'
      },
      onClick: () => toggleSort(column)
    })
  ])
}

const filteredItems = computed(() => {
  return [...props.items]
    .filter((item) => {
      const matchesSearch = !search.value
        || item.nombre.toLowerCase().includes(search.value.toLowerCase())
        || item.descripcion.toLowerCase().includes(search.value.toLowerCase())

      const matchesType = typeFilter.value === 'all' || formatFoodType(item.tipo) === typeFilter.value

      return matchesSearch && matchesType
    })
    .sort(compareItems)
})

const totalItems = computed(() => filteredItems.value.length)

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(totalItems.value / pageSize))
})

const paginatedItems = computed(() => {
  const start = (page.value - 1) * pageSize
  const end = start + pageSize

  return filteredItems.value.slice(start, end)
})

watch([search, typeFilter, sortColumn, sortDirection], () => {
  page.value = 1
})

watch(totalPages, (value) => {
  if (page.value > value) {
    page.value = value
  }
})

const columns: TableColumn<FoodCatalogItem>[] = [
  {
    accessorKey: 'nombre',
    header: () => renderSortableHeader('Platillo', 'nombre'),
    cell: ({ row }) => h('p', { class: 'py-1 font-medium text-highlighted' }, row.original.nombre)
  },
  {
    accessorKey: 'tipo',
    header: () => renderSortableHeader('Tipo', 'tipo'),
    cell: ({ row }) => h(UBadge, { color: 'primary', variant: 'subtle' }, () => formatFoodType(row.original.tipo))
  },
  {
    accessorKey: 'calorias',
    header: () => renderSortableHeader('Calorías', 'calorias', { align: 'right' }),
    cell: ({ row }) => h('div', { class: 'text-right font-medium text-highlighted' }, `${row.original.calorias} kcal`)
  },
  {
    accessorKey: 'updatedAt',
    header: () => renderSortableHeader('Actualizado', 'updatedAt'),
    cell: ({ row }) => formatDate(row.original.updatedAt)
  },
  {
    id: 'actions',
    header: () => h('div', { class: 'text-center' }, 'Detalles'),
    cell: ({ row }) => {
      return h('div', { class: 'flex justify-center' }, [
        h(UButton, {
          to: props.editTo(row.original),
          color: 'primary',
          variant: 'ghost',
          icon: 'i-lucide-square-arrow-out-up-right',
          'aria-label': 'Ver detalles'
        })
      ])
    }
  }
]
</script>

<template>
  <div class="space-y-5 p-5 sm:p-6">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Buscar por nombre o descripción"
        class="w-full lg:max-w-sm"
      />

      <div class="flex flex-wrap items-center gap-3">
        <USelect
          v-model="typeFilter"
          :items="[
            { label: 'Todos los tipos', value: 'all' },
            ...availableTypes.map((type) => ({ label: type, value: type }))
          ]"
          class="min-w-52"
          :ui="{
            content: '!max-h-none',
            viewport: '!overflow-visible'
          }"
        />
      </div>
    </div>

    <UAlert
      v-if="!loading && !filteredItems.length"
      color="neutral"
      variant="soft"
      icon="i-lucide-soup"
      title="No se encontraron platillos"
      description="Ajusta los filtros o crea un nuevo platillo desde el botón superior."
    />

    <div v-else class="relative min-h-56">
      <UTable
        :data="loading ? [] : paginatedItems"
        :columns="columns"
        class="shrink-0"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r max-lg:[&:nth-child(4)]:hidden',
          td: 'border-b border-default max-lg:[&:nth-child(4)]:hidden'
        }"
      />

      <div
        v-if="loading"
        class="absolute inset-x-0 top-[49px] z-10 flex min-h-[calc(14rem-49px)] flex-col items-center justify-center gap-3 rounded-b-2xl border-x border-b border-default/70 bg-default/85 backdrop-blur-sm"
      >
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary" />
        <p class="text-sm text-muted">
          Cargando platillos...
        </p>
      </div>
    </div>

    <div
      v-if="!loading && totalItems > pageSize"
      class="flex flex-col gap-3 border-t border-default pt-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p class="text-sm text-muted">
        Mostrando
        {{ (page - 1) * pageSize + 1 }}
        -
        {{ Math.min(page * pageSize, totalItems) }}
        de
        {{ totalItems }}
        platillos
      </p>

      <UPagination
        v-model:page="page"
        :total="totalItems"
        :items-per-page="pageSize"
        color="primary"
      />
    </div>
  </div>
</template>
