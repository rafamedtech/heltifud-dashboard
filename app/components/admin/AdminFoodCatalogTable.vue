<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { FoodCatalogItem } from '~~/types/types'
import { formatDate } from '~/utils/formatters'

const props = defineProps<{
  items: FoodCatalogItem[]
  loading?: boolean
  deletingId?: string | null
  editTo: (item: FoodCatalogItem) => unknown
}>()

const emit = defineEmits<{
  delete: [item: FoodCatalogItem]
}>()

const search = ref('')
const typeFilter = ref('all')

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

const filteredItems = computed(() => {
  return props.items.filter((item) => {
    const matchesSearch = !search.value
      || item.nombre.toLowerCase().includes(search.value.toLowerCase())
      || item.descripcion.toLowerCase().includes(search.value.toLowerCase())

    const matchesType = typeFilter.value === 'all' || formatFoodType(item.tipo) === typeFilter.value

    return matchesSearch && matchesType
  })
})

const columns: TableColumn<FoodCatalogItem>[] = [
  {
    accessorKey: 'nombre',
    header: 'Platillo',
    cell: ({ row }) => {
      return h('div', { class: 'space-y-1 py-1' }, [
        h('p', { class: 'font-medium text-highlighted' }, row.original.nombre),
        h('p', { class: 'line-clamp-2 max-w-md text-sm text-muted' }, row.original.descripcion || 'Sin descripción')
      ])
    }
  },
  {
    accessorKey: 'tipo',
    header: 'Tipo',
    cell: ({ row }) => h(UBadge, { color: 'primary', variant: 'subtle' }, () => formatFoodType(row.original.tipo))
  },
  {
    accessorKey: 'calorias',
    header: () => h('div', { class: 'text-right' }, 'Calorías'),
    cell: ({ row }) => h('div', { class: 'text-right font-medium text-highlighted' }, `${row.original.calorias} kcal`)
  },
  {
    accessorKey: 'updatedAt',
    header: 'Actualizado',
    cell: ({ row }) => formatDate(row.original.updatedAt)
  },
  {
    id: 'actions',
    header: () => h('div', { class: 'text-right' }, 'Acciones'),
    cell: ({ row }) => {
      return h('div', { class: 'flex justify-end gap-2' }, [
        h(UButton, {
          to: props.editTo(row.original),
          color: 'neutral',
          variant: 'ghost',
          icon: 'i-lucide-square-pen'
        }, () => 'Editar'),
        h(UButton, {
          color: 'error',
          variant: 'ghost',
          icon: 'i-lucide-trash',
          loading: props.deletingId === row.original.id,
          onClick: () => emit('delete', row.original)
        }, () => 'Eliminar')
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
        :data="loading ? [] : filteredItems"
        :columns="columns"
        class="shrink-0"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default'
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
  </div>
</template>
