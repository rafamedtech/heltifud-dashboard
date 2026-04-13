<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn, FormError } from '@nuxt/ui'
import type { SupplyCategoryInput, SupplyCategorySummary } from '~~/types/types'
import { supplyCategoryInputSchema } from '~~/types/menuSchema'
import { formatDate } from '~/utils/formatters'

definePageMeta({
  layout: 'admin',
  middleware: ['supabase-auth']
})

useSeoMeta({
  title: 'Categorías de insumos | Heltifud Meal Preps',
  description: 'Administra las categorías de insumos del panel administrativo de Heltifud.',
  robots: 'noindex, nofollow'
})

type CategoryFormState = SupplyCategoryInput

const toast = useToast()
const openForm = ref(false)
const isSaving = ref(false)
const editingCategoryId = ref<string | null>(null)
const pendingDeleteCategory = ref<SupplyCategorySummary | null>(null)
const deletingCategoryId = ref<string | null>(null)
const search = ref('')
const statusFilter = ref('all')

const formState = reactive<CategoryFormState>({
  nombre: '',
  descripcion: '',
  isActive: true,
  sortOrder: 0
})

const fieldErrors = reactive<Record<keyof CategoryFormState, string>>({
  nombre: '',
  descripcion: '',
  isActive: '',
  sortOrder: ''
})

const formErrors = computed<FormError[]>(() =>
  (Object.entries(fieldErrors) as Array<[keyof CategoryFormState, string]>)
    .filter(([, message]) => Boolean(message))
    .map(([name, message]) => ({ name, message }))
)

const { data: categories, refresh, status } = useFetch<SupplyCategorySummary[]>('/api/supply-categories', {
  query: { includeInactive: '1' },
  default: () => []
})

const { saveSupplyCategory, deleteSupplyCategory } = useSupplyCategories()

const isLoading = computed(() => status.value === 'idle' || status.value === 'pending')
const isDeleteModalOpen = computed({
  get: () => Boolean(pendingDeleteCategory.value),
  set: (value) => {
    if (!value) {
      pendingDeleteCategory.value = null
    }
  }
})
const deleteModalDescription = computed(() =>
  pendingDeleteCategory.value
    ? `Se eliminará "${pendingDeleteCategory.value.nombre}".`
    : undefined
)

const filteredCategories = computed(() => {
  return (categories.value ?? []).filter((category) => {
    const normalizedSearch = search.value.trim().toLocaleLowerCase('es-MX')
    const matchesSearch = !normalizedSearch
      || category.nombre.toLocaleLowerCase('es-MX').includes(normalizedSearch)
      || category.descripcion.toLocaleLowerCase('es-MX').includes(normalizedSearch)
      || category.slug.toLocaleLowerCase('es-MX').includes(normalizedSearch)

    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'active' && category.isActive)
      || (statusFilter.value === 'inactive' && !category.isActive)

    return matchesSearch && matchesStatus
  })
})

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const columns: TableColumn<SupplyCategorySummary>[] = [
  {
    accessorKey: 'nombre',
    header: 'Categoría',
    cell: ({ row }) => h('div', { class: 'space-y-1 py-1' }, [
      h('p', { class: 'font-medium text-highlighted' }, row.original.nombre),
      h('p', { class: 'line-clamp-2 text-sm text-muted' }, row.original.descripcion || 'Sin descripción')
    ])
  },
  {
    accessorKey: 'slug',
    header: 'Slug'
  },
  {
    accessorKey: 'sortOrder',
    header: () => h('div', { class: 'text-right' }, 'Orden'),
    cell: ({ row }) => h('div', { class: 'text-right text-toned' }, row.original.sortOrder)
  },
  {
    accessorKey: 'isActive',
    header: 'Estado',
    cell: ({ row }) => h(UBadge, {
      color: row.original.isActive ? 'success' : 'neutral',
      variant: 'subtle'
    }, () => row.original.isActive ? 'Activa' : 'Inactiva')
  },
  {
    accessorKey: 'updatedAt',
    header: 'Actualizado',
    cell: ({ row }) => formatDate(row.original.updatedAt)
  },
  {
    id: 'actions',
    header: () => h('div', { class: 'text-right' }, 'Acciones'),
    cell: ({ row }) => h('div', { class: 'flex justify-end gap-2' }, [
      h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        icon: 'i-lucide-square-pen',
        onClick: () => openEditForm(row.original)
      }, () => 'Editar'),
      h(UButton, {
        color: 'error',
        variant: 'ghost',
        icon: 'i-lucide-trash',
        loading: deletingCategoryId.value === row.original.id,
        onClick: () => {
          pendingDeleteCategory.value = row.original
        }
      }, () => 'Eliminar')
    ])
  }
]

function resetForm() {
  formState.nombre = ''
  formState.descripcion = ''
  formState.isActive = true
  formState.sortOrder = 0
  editingCategoryId.value = null

  Object.keys(fieldErrors).forEach((key) => {
    fieldErrors[key as keyof CategoryFormState] = ''
  })
}

function openCreateForm() {
  resetForm()
  openForm.value = true
}

function openEditForm(category: SupplyCategorySummary) {
  resetForm()
  editingCategoryId.value = category.id
  formState.nombre = category.nombre
  formState.descripcion = category.descripcion
  formState.isActive = category.isActive
  formState.sortOrder = category.sortOrder
  openForm.value = true
}

async function onSubmitForm() {
  if (isSaving.value) {
    return
  }

  Object.keys(fieldErrors).forEach((key) => {
    fieldErrors[key as keyof CategoryFormState] = ''
  })

  const payload: SupplyCategoryInput = {
    nombre: formState.nombre.trim(),
    descripcion: formState.descripcion.trim(),
    isActive: formState.isActive,
    sortOrder: Number(formState.sortOrder) || 0
  }

  const parsed = supplyCategoryInputSchema.safeParse(payload)

  if (!parsed.success) {
    parsed.error.issues.forEach((issue) => {
      const fieldName = issue.path[0]

      if (typeof fieldName === 'string' && fieldName in fieldErrors && !fieldErrors[fieldName as keyof CategoryFormState]) {
        fieldErrors[fieldName as keyof CategoryFormState] = issue.message
      }
    })

    toast.add({
      title: 'La categoría no se pudo guardar',
      description: 'Revisa los campos obligatorios antes de continuar.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  isSaving.value = true

  try {
    await saveSupplyCategory(parsed.data, editingCategoryId.value ?? undefined)
    await refresh()
    toast.add({
      title: editingCategoryId.value ? 'Categoría actualizada' : 'Categoría creada',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    openForm.value = false
    resetForm()
  } catch (error) {
    toast.add({
      title: 'No se pudo guardar la categoría',
      description: error instanceof Error ? error.message : 'Intenta de nuevo en unos segundos.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    isSaving.value = false
  }
}

async function onDeleteCategory() {
  if (!pendingDeleteCategory.value || deletingCategoryId.value) {
    return
  }

  deletingCategoryId.value = pendingDeleteCategory.value.id

  try {
    await deleteSupplyCategory(pendingDeleteCategory.value.id)
    await refresh()
    toast.add({
      title: 'Categoría eliminada',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    pendingDeleteCategory.value = null
  } catch (error) {
    toast.add({
      title: 'No se pudo eliminar la categoría',
      description: error instanceof Error ? error.message : 'Intenta de nuevo en unos segundos.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    deletingCategoryId.value = null
  }
}
</script>

<template>
  <main class="space-y-6">
    <section class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="space-y-1">
        <h1 class="text-3xl font-semibold tracking-tight text-primary">
          Categorías de insumos
        </h1>
        <p class="max-w-2xl text-sm text-muted">
          Organiza los insumos por familias operativas para facilitar recetas, compras y análisis.
        </p>
      </div>

      <div class="flex items-center gap-3 lg:justify-end">
        <UButton
          to="/configuracion"
          color="neutral"
          variant="subtle"
          icon="i-lucide-arrow-left"
        >
          Regresar
        </UButton>

        <UButton icon="i-lucide-plus" @click="openCreateForm">
          Nueva categoría
        </UButton>
      </div>
    </section>

    <div class="mx-auto w-full max-w-6xl">
      <UCard class="app-surface overflow-hidden" :ui="{ body: 'space-y-5 p-5 sm:p-6' }">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Buscar por nombre, slug o descripción"
            class="w-full lg:max-w-sm"
          />

          <USelect
            v-model="statusFilter"
            :items="[
              { label: 'Todas', value: 'all' },
              { label: 'Activas', value: 'active' },
              { label: 'Inactivas', value: 'inactive' }
            ]"
            class="min-w-44"
          />
        </div>

        <UAlert
          v-if="!isLoading && !filteredCategories.length"
          color="neutral"
          variant="soft"
          icon="i-lucide-tags"
          title="No se encontraron categorías"
          description="Ajusta los filtros o crea una nueva categoría para empezar."
        />

        <div v-else class="relative min-h-56">
          <UTable
            :data="isLoading ? [] : filteredCategories"
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
            v-if="isLoading"
            class="absolute inset-x-0 top-[49px] z-10 flex min-h-[calc(14rem-49px)] flex-col items-center justify-center gap-3 rounded-b-2xl border-x border-b border-default/70 bg-default/85 backdrop-blur-sm"
          >
            <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary" />
            <p class="text-sm text-muted">
              Cargando categorías...
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <UModal
      v-model:open="openForm"
      :title="editingCategoryId ? 'Editar categoría' : 'Nueva categoría'"
      :description="editingCategoryId ? 'Actualiza la información operativa de esta categoría.' : 'Crea una categoría para organizar los insumos.'"
      :ui="{ content: 'max-w-2xl' }"
    >
      <template #body>
        <UForm :state="formState" :errors="formErrors" class="space-y-4" @submit.prevent="onSubmitForm">
          <UFormField name="nombre" label="Nombre" :ui="{ label: 'font-semibold text-highlighted' }">
            <UInput v-model="formState.nombre" class="w-full" placeholder="Ej. Proteínas, secos, abarrotes" />
          </UFormField>

          <UFormField name="descripcion" label="Descripción" :ui="{ label: 'font-semibold text-highlighted' }">
            <UTextarea
              v-model="formState.descripcion"
              class="w-full"
              :rows="4"
              autoresize
              placeholder="Notas rápidas sobre el uso de esta categoría."
            />
          </UFormField>

          <div class="grid gap-4 md:grid-cols-[180px_1fr]">
            <UFormField name="sortOrder" label="Orden" :ui="{ label: 'font-semibold text-highlighted' }">
              <UInput
                v-model.number="formState.sortOrder"
                class="w-full"
                type="number"
                min="0"
                placeholder="0"
              />
            </UFormField>

            <UFormField label="Estado" :ui="{ label: 'font-semibold text-highlighted' }">
              <div class="flex h-11 items-center justify-between rounded-xl border border-default/70 bg-default px-3">
                <span class="text-sm text-toned">
                  {{ formState.isActive ? 'Activa' : 'Inactiva' }}
                </span>
                <USwitch v-model="formState.isActive" />
              </div>
            </UFormField>
          </div>
        </UForm>
      </template>

      <template #footer>
        <div class="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <UButton color="neutral" variant="ghost" @click="openForm = false">
            Cancelar
          </UButton>
          <UButton :loading="isSaving" icon="i-lucide-save" @click="onSubmitForm">
            {{ editingCategoryId ? 'Guardar cambios' : 'Crear categoría' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isDeleteModalOpen"
      title="Eliminar categoría"
      :description="deleteModalDescription"
      :ui="{ content: 'max-w-md' }"
    >
      <template #body>
        <UAlert
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="Confirma esta acción"
          description="Si la categoría todavía tiene insumos vinculados, el sistema bloqueará la eliminación."
        />
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <UButton color="neutral" variant="ghost" @click="pendingDeleteCategory = null">
            Cancelar
          </UButton>
          <UButton color="error" :loading="deletingCategoryId === pendingDeleteCategory?.id" @click="onDeleteCategory">
            Eliminar categoría
          </UButton>
        </div>
      </template>
    </UModal>
  </main>
</template>
