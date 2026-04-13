<script setup lang="ts">
import type { FormError } from '@nuxt/ui'
import type { MeasurementUnit, SupplyCategorySummary, SupplyItemInput, SupplyItemSummary } from '~~/types/types'
import { supplyItemInputSchema } from '~~/types/menuSchema'
import { formatDate } from '~/utils/formatters'
import { MEASUREMENT_UNIT_VALUES } from '~~/types/types'

definePageMeta({
  layout: 'admin',
  middleware: ['supabase-auth']
})

useSeoMeta({
  title: 'Insumos | Heltifud Meal Preps',
  description: 'Administra el catálogo de insumos del panel administrativo de Heltifud.',
  robots: 'noindex, nofollow'
})

type SupplyFormState = Omit<SupplyItemInput, 'tags'> & {
  tagsText: string
}

const toast = useToast()
const openForm = ref(false)
const isSaving = ref(false)
const editingSupplyId = ref<string | null>(null)
const pendingDeleteSupply = ref<SupplyItemSummary | null>(null)
const deletingSupplyId = ref<string | null>(null)
const search = ref('')
const categoryFilter = ref('all')
const statusFilter = ref('all')

const formState = reactive<SupplyFormState>({
  nombre: '',
  descripcion: '',
  codigo: null,
  unidadBase: 'GRAMO',
  tagsText: '',
  isActive: true,
  costoReferencial: null,
  mermaPorcentaje: null,
  categoryId: null
})

const fieldErrors = reactive<Record<keyof SupplyFormState, string>>({
  nombre: '',
  descripcion: '',
  codigo: '',
  unidadBase: '',
  tagsText: '',
  isActive: '',
  costoReferencial: '',
  mermaPorcentaje: '',
  categoryId: ''
})

const formErrors = computed<FormError[]>(() =>
  (Object.entries(fieldErrors) as Array<[keyof SupplyFormState, string]>)
    .filter(([, message]) => Boolean(message))
    .map(([name, message]) => ({ name, message }))
)

const { data: supplies, refresh, status } = useFetch<SupplyItemSummary[]>('/api/supplies', {
  query: { includeInactive: '1' },
  default: () => []
})
const { data: categories } = useFetch<SupplyCategorySummary[]>('/api/supply-categories', {
  query: { includeInactive: '1' },
  default: () => []
})

const { saveSupply, deleteSupply } = useSupplies()

const isLoading = computed(() => status.value === 'idle' || status.value === 'pending')
const isDeleteModalOpen = computed({
  get: () => Boolean(pendingDeleteSupply.value),
  set: (value) => {
    if (!value) {
      pendingDeleteSupply.value = null
    }
  }
})
const deleteModalDescription = computed(() =>
  pendingDeleteSupply.value
    ? `Se eliminará "${pendingDeleteSupply.value.nombre}".`
    : undefined
)

const categoryOptions = computed(() => [
  { label: 'Sin categoría', value: '__none__' },
  ...(categories.value ?? []).map(category => ({
    label: category.nombre,
    value: category.id
  }))
])

const tableCategoryOptions = computed(() => [
  { label: 'Todas las categorías', value: 'all' },
  { label: 'Sin categoría', value: '__none__' },
  ...(categories.value ?? []).map(category => ({
    label: category.nombre,
    value: category.id
  }))
])

const measurementUnitOptions = [...MEASUREMENT_UNIT_VALUES].map(unit => ({
  label: formatMeasurementUnit(unit),
  value: unit
}))

const filteredSupplies = computed(() => {
  return (supplies.value ?? []).filter((supply) => {
    const normalizedSearch = search.value.trim().toLocaleLowerCase('es-MX')
    const matchesSearch = !normalizedSearch
      || supply.nombre.toLocaleLowerCase('es-MX').includes(normalizedSearch)
      || supply.descripcion.toLocaleLowerCase('es-MX').includes(normalizedSearch)
      || (supply.codigo ?? '').toLocaleLowerCase('es-MX').includes(normalizedSearch)

    const matchesCategory = categoryFilter.value === 'all'
      || (categoryFilter.value === '__none__' && !supply.category)
      || supply.category?.id === categoryFilter.value

    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'active' && supply.isActive)
      || (statusFilter.value === 'inactive' && !supply.isActive)

    return matchesSearch && matchesCategory && matchesStatus
  })
})

function formatMeasurementUnit(unit: MeasurementUnit) {
  return unit.charAt(0) + unit.slice(1).toLocaleLowerCase('es-MX')
}

function resetForm() {
  formState.nombre = ''
  formState.descripcion = ''
  formState.codigo = null
  formState.unidadBase = 'GRAMO'
  formState.tagsText = ''
  formState.isActive = true
  formState.costoReferencial = null
  formState.mermaPorcentaje = null
  formState.categoryId = null
  editingSupplyId.value = null

  Object.keys(fieldErrors).forEach((key) => {
    fieldErrors[key as keyof SupplyFormState] = ''
  })
}

function openCreateForm() {
  resetForm()
  openForm.value = true
}

function openEditForm(supply: SupplyItemSummary) {
  resetForm()
  editingSupplyId.value = supply.id
  formState.nombre = supply.nombre
  formState.descripcion = supply.descripcion
  formState.codigo = supply.codigo
  formState.unidadBase = supply.unidadBase
  formState.tagsText = supply.tags.join(', ')
  formState.isActive = supply.isActive
  formState.costoReferencial = supply.costoReferencial
  formState.mermaPorcentaje = supply.mermaPorcentaje
  formState.categoryId = supply.category?.id ?? null
  openForm.value = true
}

async function onSubmitForm() {
  if (isSaving.value) {
    return
  }

  Object.keys(fieldErrors).forEach((key) => {
    fieldErrors[key as keyof SupplyFormState] = ''
  })

  const payload: SupplyItemInput = {
    nombre: formState.nombre.trim(),
    descripcion: formState.descripcion.trim(),
    codigo: formState.codigo?.trim() ? formState.codigo.trim() : null,
    unidadBase: formState.unidadBase,
    tags: formState.tagsText
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean),
    isActive: formState.isActive,
    costoReferencial: formState.costoReferencial === null || formState.costoReferencial === undefined
      ? null
      : Number(formState.costoReferencial),
    mermaPorcentaje: formState.mermaPorcentaje === null || formState.mermaPorcentaje === undefined
      ? null
      : Number(formState.mermaPorcentaje),
    categoryId: formState.categoryId
  }

  const parsed = supplyItemInputSchema.safeParse(payload)

  if (!parsed.success) {
    parsed.error.issues.forEach((issue) => {
      const fieldName = issue.path[0]

      if (typeof fieldName === 'string' && fieldName in fieldErrors && !fieldErrors[fieldName as keyof SupplyFormState]) {
        fieldErrors[fieldName as keyof SupplyFormState] = issue.message
      }
    })

    toast.add({
      title: 'El insumo no se pudo guardar',
      description: 'Revisa los campos obligatorios antes de continuar.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  isSaving.value = true

  try {
    await saveSupply(parsed.data, editingSupplyId.value ?? undefined)
    await refresh()
    toast.add({
      title: editingSupplyId.value ? 'Insumo actualizado' : 'Insumo creado',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    openForm.value = false
    resetForm()
  } catch (error) {
    toast.add({
      title: 'No se pudo guardar el insumo',
      description: error instanceof Error ? error.message : 'Intenta de nuevo en unos segundos.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    isSaving.value = false
  }
}

async function onDeleteSupply() {
  if (!pendingDeleteSupply.value || deletingSupplyId.value) {
    return
  }

  deletingSupplyId.value = pendingDeleteSupply.value.id

  try {
    await deleteSupply(pendingDeleteSupply.value.id)
    await refresh()
    toast.add({
      title: 'Insumo eliminado',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    pendingDeleteSupply.value = null
  } catch (error) {
    toast.add({
      title: 'No se pudo eliminar el insumo',
      description: error instanceof Error ? error.message : 'Intenta de nuevo en unos segundos.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    deletingSupplyId.value = null
  }
}
</script>

<template>
  <main class="space-y-6">
    <section class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="space-y-1">
        <h1 class="text-3xl font-semibold tracking-tight text-primary">
          Insumos
        </h1>
        <p class="max-w-2xl text-sm text-muted">
          Administra el catálogo de insumos reutilizables para recetas y operación diaria.
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
          Nuevo insumo
        </UButton>
      </div>
    </section>

    <div class="mx-auto w-full max-w-6xl">
      <UCard class="app-surface overflow-hidden" :ui="{ body: 'space-y-5 p-5 sm:p-6' }">
        <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Buscar por nombre, descripción o código"
            class="w-full xl:max-w-sm"
          />

          <div class="flex flex-wrap items-center gap-3">
            <USelect
              v-model="categoryFilter"
              :items="tableCategoryOptions"
              class="min-w-52"
            />

            <USelect
              v-model="statusFilter"
              :items="[
                { label: 'Todos', value: 'all' },
                { label: 'Activos', value: 'active' },
                { label: 'Inactivos', value: 'inactive' }
              ]"
              class="min-w-40"
            />
          </div>
        </div>

        <UAlert
          v-if="!isLoading && !filteredSupplies.length"
          color="neutral"
          variant="soft"
          icon="i-lucide-package"
          title="No se encontraron insumos"
          description="Ajusta los filtros o crea un nuevo insumo para empezar."
        />

        <div v-else class="relative min-h-56">
          <div class="overflow-hidden rounded-2xl border border-default/70 bg-default">
            <div
              v-if="isLoading"
              class="flex min-h-56 flex-col items-center justify-center gap-3 px-6 py-10"
            >
              <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary" />
              <p class="text-sm text-muted">
                Cargando insumos...
              </p>
            </div>

            <div v-else class="divide-y divide-default/70">
              <article
                v-for="supply in filteredSupplies"
                :key="supply.id"
                class="flex flex-col gap-4 px-4 py-4 sm:px-5"
              >
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div class="min-w-0 flex-1 space-y-3">
                    <div class="space-y-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <h3 class="text-base font-semibold text-highlighted">
                          {{ supply.nombre }}
                        </h3>

                        <UBadge
                          :color="supply.isActive ? 'success' : 'neutral'"
                          variant="subtle"
                        >
                          {{ supply.isActive ? 'Activo' : 'Inactivo' }}
                        </UBadge>
                      </div>

                      <p class="text-sm text-muted">
                        {{ supply.descripcion || supply.codigo || 'Sin descripción' }}
                      </p>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                      <UBadge color="neutral" variant="soft">
                        {{ supply.category?.nombre ?? 'Sin categoría' }}
                      </UBadge>

                      <UBadge color="neutral" variant="soft">
                        {{ formatMeasurementUnit(supply.unidadBase) }}
                      </UBadge>

                      <UBadge v-if="supply.codigo" color="neutral" variant="soft">
                        {{ supply.codigo }}
                      </UBadge>
                    </div>
                  </div>

                  <div class="flex flex-col items-stretch gap-2 sm:flex-row lg:items-center">
                    <p class="text-sm text-muted lg:mr-2">
                      Actualizado {{ formatDate(supply.updatedAt) }}
                    </p>

                    <UButton
                      color="primary"
                      variant="subtle"
                      icon="i-lucide-square-pen"
                      class="cursor-pointer"
                      @click="openEditForm(supply)"
                    >
                      Modificar detalles
                    </UButton>

                    <UButton
                      color="error"
                      variant="ghost"
                      icon="i-lucide-trash"
                      class="cursor-pointer"
                      :loading="deletingSupplyId === supply.id"
                      @click="pendingDeleteSupply = supply"
                    >
                      Eliminar
                    </UButton>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <UModal
      v-model:open="openForm"
      :title="editingSupplyId ? 'Editar insumo' : 'Nuevo insumo'"
      :description="editingSupplyId ? 'Actualiza la información operativa de este insumo.' : 'Crea un insumo reutilizable para recetas y compras.'"
      :ui="{ content: 'max-w-3xl' }"
    >
      <template #body>
        <UForm :state="formState" :errors="formErrors" class="space-y-4" @submit.prevent="onSubmitForm">
          <div class="grid gap-4 md:grid-cols-2">
            <UFormField name="nombre" label="Nombre" :ui="{ label: 'font-semibold text-highlighted' }">
              <UInput v-model="formState.nombre" class="w-full" placeholder="Ej. Pechuga de pollo" />
            </UFormField>

            <UFormField name="codigo" label="Código" :ui="{ label: 'font-semibold text-highlighted' }">
              <UInput
                :model-value="formState.codigo ?? ''"
                class="w-full"
                placeholder="SKU o código interno"
                @update:model-value="(value) => formState.codigo = value || null"
              />
            </UFormField>
          </div>

          <UFormField name="descripcion" label="Descripción" :ui="{ label: 'font-semibold text-highlighted' }">
            <UTextarea
              v-model="formState.descripcion"
              class="w-full"
              :rows="4"
              autoresize
              placeholder="Notas rápidas para identificar el insumo."
            />
          </UFormField>

          <div class="grid gap-4 md:grid-cols-2">
            <UFormField name="unidadBase" label="Unidad base" :ui="{ label: 'font-semibold text-highlighted' }">
              <USelect
                v-model="formState.unidadBase"
                :items="measurementUnitOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>

            <UFormField name="categoryId" label="Categoría" :ui="{ label: 'font-semibold text-highlighted' }">
              <USelect
                :model-value="formState.categoryId ?? '__none__'"
                :items="categoryOptions"
                value-key="value"
                class="w-full"
                @update:model-value="(value) => formState.categoryId = value === '__none__' ? null : value"
              />
            </UFormField>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <UFormField name="costoReferencial" label="Costo referencial" :ui="{ label: 'font-semibold text-highlighted' }">
              <UInput
                :model-value="formState.costoReferencial ?? undefined"
                class="w-full"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                @update:model-value="(value) => formState.costoReferencial = value === undefined ? null : Number(value)"
              />
            </UFormField>

            <UFormField name="mermaPorcentaje" label="Merma %" :ui="{ label: 'font-semibold text-highlighted' }">
              <UInput
                :model-value="formState.mermaPorcentaje ?? undefined"
                class="w-full"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="0"
                @update:model-value="(value) => formState.mermaPorcentaje = value === undefined ? null : Number(value)"
              />
            </UFormField>
          </div>

          <div class="grid gap-4 md:grid-cols-[1fr_180px]">
            <UFormField name="tagsText" label="Tags" :ui="{ label: 'font-semibold text-highlighted' }">
              <UInput
                v-model="formState.tagsText"
                class="w-full"
                placeholder="Separados por coma, ej. proteina, congelado"
              />
            </UFormField>

            <UFormField label="Estado" :ui="{ label: 'font-semibold text-highlighted' }">
              <div class="flex h-11 items-center justify-between rounded-xl border border-default/70 bg-default px-3">
                <span class="text-sm text-toned">
                  {{ formState.isActive ? 'Activo' : 'Inactivo' }}
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
            {{ editingSupplyId ? 'Guardar cambios' : 'Crear insumo' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isDeleteModalOpen"
      title="Eliminar insumo"
      :description="deleteModalDescription"
      :ui="{ content: 'max-w-md' }"
    >
      <template #body>
        <UAlert
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="Confirma esta acción"
          description="Si el insumo todavía se usa en recetas, el sistema bloqueará la eliminación."
        />
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <UButton color="neutral" variant="ghost" @click="pendingDeleteSupply = null">
            Cancelar
          </UButton>
          <UButton color="error" :loading="deletingSupplyId === pendingDeleteSupply?.id" @click="onDeleteSupply">
            Eliminar insumo
          </UButton>
        </div>
      </template>
    </UModal>
  </main>
</template>
