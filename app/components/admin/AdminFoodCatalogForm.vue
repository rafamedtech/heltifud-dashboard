<script setup lang="ts">
import type { FormError } from '@nuxt/ui'
import type {
  FoodCatalogItem,
  FoodCatalogItemDetail,
  FoodCatalogItemInput,
  MeasurementUnit,
  RecipeStatus,
  SupplyCategorySummary,
  SupplyItemSummary
} from '~~/types/types'
import Skeleton from 'boneyard-js/vue'
import fieldsBones from '~/bones/admin-food-catalog-edit-fields.bones.json'
import sidebarBones from '~/bones/admin-food-catalog-edit-sidebar.bones.json'
import { foodCatalogItemInputSchema } from '~~/types/menuSchema'
import { formatDateTime } from '~/utils/formatters'
import { MEASUREMENT_UNIT_VALUES, RECIPE_STATUS_VALUES } from '~~/types/types'

const props = withDefaults(
  defineProps<{
    formId?: string
    hideSubmit?: boolean
    item?: FoodCatalogItemDetail | null
    loadingFields?: boolean
    loadingSidebar?: boolean
    mode?: 'create' | 'edit'
  }>(),
  {
    formId: undefined,
    hideSubmit: false,
    loadingFields: false,
    loadingSidebar: false,
    mode: 'create',
    item: null
  }
)

const emit = defineEmits<{
  'saved': []
  'dirty-change': [value: boolean]
}>()

type RecipeIngredientFormState = {
  supplyName: string
  supplyDescription: string
  supplyCode: string
  supplyUnitBase: MeasurementUnit
  supplyCategoryName: string
  supplyTagsText: string
  supplyCostoReferencial: number | null
  supplyMermaPorcentaje: number | null
  grupo: string
  cantidad: number | null
  unidad: MeasurementUnit
  notas: string
  opcional: boolean
}

type RecipeFormState = {
  status: RecipeStatus
  porciones: number | null
  rendimientoCantidad: number | null
  rendimientoUnidad: MeasurementUnit | undefined
  tiempoPreparacionMin: number | null
  tiempoCoccionMin: number | null
  instrucciones: string
  notas: string
  ingredients: RecipeIngredientFormState[]
}

type FoodCatalogFormState = Omit<FoodCatalogItemInput, 'tipo' | 'recipe'> & {
  tipo?: string
  recipe: RecipeFormState
}

type FieldErrorKey = keyof Omit<FoodCatalogItemInput, 'recipe'> | 'recipe'
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

const toast = useToast()
const { saveFoodCatalogItem } = useFoodCatalog()
const { data: catalogItems } = useFetch<FoodCatalogItem[]>('/api/food-components', {
  key: 'food-catalog-items-validation',
  default: () => []
})
const { data: supplyItems } = useFetch<SupplyItemSummary[]>('/api/supplies', {
  key: 'supply-items-catalog',
  default: () => []
})
const { data: supplyCategories } = useFetch<SupplyCategorySummary[]>('/api/supply-categories', {
  key: 'supply-categories-catalog',
  default: () => []
})

const foodTypeOptions = [
  'Desayuno',
  'Comida',
  'Cena',
  'Guarnición',
  'Snack',
  'Ramekin'
]

const recipeStatusOptions = [...RECIPE_STATUS_VALUES]
const unitOptions = [...MEASUREMENT_UNIT_VALUES]
const fieldsSkeleton = fieldsBones as unknown as SkeletonResponsiveBones
const sidebarSkeleton = sidebarBones as unknown as SkeletonResponsiveBones

const state = reactive<FoodCatalogFormState>({
  nombre: '',
  descripcion: '',
  calorias: 0,
  imagen: '',
  tipo: undefined,
  recipe: createEmptyRecipe()
})

const isSubmitting = ref(false)
const ingredientModalOpen = ref(false)
const editingIngredientIndex = ref<number | null>(null)
const errorMessage = ref('')
const recipeIssues = ref<string[]>([])
const initialSnapshot = ref('')
const fieldErrors = reactive<Record<FieldErrorKey, string>>({
  nombre: '',
  descripcion: '',
  calorias: '',
  imagen: '',
  tipo: '',
  recipe: ''
})

const formErrors = computed<FormError[]>(() =>
  (Object.entries(fieldErrors) as Array<[FieldErrorKey, string]>)
    .filter(([, message]) => Boolean(message))
    .map(([name, message]) => ({ name, message }))
)

const ingredientCount = computed(() => state.recipe.ingredients.length)
const ingredientPreview = computed(() =>
  state.recipe.ingredients
    .map(ingredient => ingredient.supplyName.trim())
    .filter(Boolean)
    .slice(0, 4)
)
const ingredientDraft = reactive<RecipeIngredientFormState>(createEmptyIngredient())
const isCreatingIngredient = computed(() => editingIngredientIndex.value === null)

function createEmptyIngredient(): RecipeIngredientFormState {
  return {
    supplyName: '',
    supplyDescription: '',
    supplyCode: '',
    supplyUnitBase: 'GRAMO',
    supplyCategoryName: '',
    supplyTagsText: '',
    supplyCostoReferencial: null,
    supplyMermaPorcentaje: null,
    grupo: '',
    cantidad: null,
    unidad: 'GRAMO',
    notas: '',
    opcional: false
  }
}

function createEmptyRecipe(): RecipeFormState {
  return {
    status: 'BORRADOR',
    porciones: null,
    rendimientoCantidad: null,
    rendimientoUnidad: undefined,
    tiempoPreparacionMin: null,
    tiempoCoccionMin: null,
    instrucciones: '',
    notas: '',
    ingredients: []
  }
}

function syncIngredientDraft(source?: RecipeIngredientFormState | null) {
  const nextValue = source ?? createEmptyIngredient()

  ingredientDraft.supplyName = nextValue.supplyName
  ingredientDraft.supplyDescription = nextValue.supplyDescription
  ingredientDraft.supplyCode = nextValue.supplyCode
  ingredientDraft.supplyUnitBase = nextValue.supplyUnitBase
  ingredientDraft.supplyCategoryName = nextValue.supplyCategoryName
  ingredientDraft.supplyTagsText = nextValue.supplyTagsText
  ingredientDraft.supplyCostoReferencial = nextValue.supplyCostoReferencial
  ingredientDraft.supplyMermaPorcentaje = nextValue.supplyMermaPorcentaje
  ingredientDraft.grupo = nextValue.grupo
  ingredientDraft.cantidad = nextValue.cantidad
  ingredientDraft.unidad = nextValue.unidad
  ingredientDraft.notas = nextValue.notas
  ingredientDraft.opcional = nextValue.opcional
}

function formatEnumLabel(value: string) {
  return value
    .toLocaleLowerCase('es-MX')
    .split('_')
    .map(part => part.charAt(0).toLocaleUpperCase('es-MX') + part.slice(1))
    .join(' ')
}

function formatRecipeUnitLabel(unit: MeasurementUnit, quantity: number | null) {
  const baseLabel = formatEnumLabel(unit)

  if (quantity === null || quantity === 1) {
    return baseLabel
  }

  return `${baseLabel}(s)`
}

function tagsToText(tags: string[]) {
  return tags.join(', ')
}

function textToTags(value: string) {
  return value
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)
}

function toNullableNumber(value: number | string | null | undefined) {
  if (value === '' || value === null || value === undefined || Number.isNaN(Number(value))) {
    return null
  }

  return Number(value)
}

function ingredientHasContent(ingredient: RecipeIngredientFormState) {
  return Boolean(
    ingredient.supplyName.trim()
    || ingredient.supplyDescription.trim()
    || ingredient.supplyCode.trim()
    || ingredient.supplyCategoryName.trim()
    || ingredient.supplyTagsText.trim()
    || ingredient.grupo.trim()
    || ingredient.notas.trim()
    || ingredient.supplyCostoReferencial !== null
    || ingredient.supplyMermaPorcentaje !== null
    || ingredient.cantidad !== null
  )
}

function recipeHasContent(recipe: RecipeFormState) {
  return Boolean(
    recipe.ingredients.some(ingredientHasContent)
    || recipe.instrucciones.trim()
    || recipe.notas.trim()
    || recipe.porciones !== null
    || recipe.rendimientoCantidad !== null
    || recipe.rendimientoUnidad
    || recipe.tiempoPreparacionMin !== null
    || recipe.tiempoCoccionMin !== null
  )
}

function showValidationToast() {
  toast.add({
    title: 'El platillo no se pudo guardar',
    description: 'Revisa los campos marcados y los datos de la receta antes de intentar de nuevo.',
    color: 'error',
    icon: 'i-lucide-circle-alert'
  })
}

function findDuplicateName(nombre: string) {
  const normalizedName = nombre.trim().toLocaleLowerCase('es-MX')

  return (catalogItems.value ?? []).find(
    item =>
      item.id !== props.item?.id
      && item.nombre.trim().toLocaleLowerCase('es-MX') === normalizedName
  )
}

function syncState(item?: FoodCatalogItemDetail | null) {
  state.nombre = item?.nombre ?? ''
  state.descripcion = item?.descripcion ?? ''
  state.calorias = item?.calorias ?? 0
  state.imagen = item?.imagen ?? ''
  state.tipo = item?.tipo ?? undefined
  state.recipe = item?.recipe
    ? {
        status: item.recipe.status,
        porciones: item.recipe.porciones,
        rendimientoCantidad: item.recipe.rendimientoCantidad,
        rendimientoUnidad: item.recipe.rendimientoUnidad ?? undefined,
        tiempoPreparacionMin: item.recipe.tiempoPreparacionMin,
        tiempoCoccionMin: item.recipe.tiempoCoccionMin,
        instrucciones: item.recipe.instrucciones,
        notas: item.recipe.notas,
        ingredients: item.recipe.ingredients.map(ingredient => ({
          supplyName: ingredient.supplyItem.nombre,
          supplyDescription: ingredient.supplyItem.descripcion,
          supplyCode: ingredient.supplyItem.codigo ?? '',
          supplyUnitBase: ingredient.supplyItem.unidadBase,
          supplyCategoryName: ingredient.supplyItem.category?.nombre ?? '',
          supplyTagsText: tagsToText(ingredient.supplyItem.tags),
          supplyCostoReferencial: ingredient.supplyItem.costoReferencial,
          supplyMermaPorcentaje: ingredient.supplyItem.mermaPorcentaje,
          grupo: ingredient.grupo ?? '',
          cantidad: ingredient.cantidad,
          unidad: ingredient.unidad,
          notas: ingredient.notas,
          opcional: ingredient.opcional
        }))
      }
    : createEmptyRecipe()

  initialSnapshot.value = JSON.stringify(state)
}

function resetValidationState() {
  errorMessage.value = ''
  recipeIssues.value = []
  Object.keys(fieldErrors).forEach((key) => {
    fieldErrors[key as FieldErrorKey] = ''
  })
}

function openCreateIngredientModal() {
  editingIngredientIndex.value = null
  syncIngredientDraft()
  ingredientModalOpen.value = true
}

function removeIngredient(index: number) {
  state.recipe.ingredients.splice(index, 1)
}

function openEditIngredientModal(index: number) {
  const ingredient = state.recipe.ingredients[index]
  if (!ingredient) {
    return
  }

  editingIngredientIndex.value = index
  syncIngredientDraft(ingredient)
  ingredientModalOpen.value = true
}

function closeIngredientModal() {
  ingredientModalOpen.value = false
  editingIngredientIndex.value = null
  syncIngredientDraft()
}

function hydrateIngredientFromCatalog(ingredient: RecipeIngredientFormState) {
  if (!ingredient) {
    return
  }

  const normalizedName = ingredient.supplyName.trim().toLocaleLowerCase('es-MX')

  if (!normalizedName) {
    return
  }

  const matchedSupply = (supplyItems.value ?? []).find(
    item => item.nombre.trim().toLocaleLowerCase('es-MX') === normalizedName
  )

  if (!matchedSupply) {
    return
  }

  ingredient.supplyDescription ||= matchedSupply.descripcion
  ingredient.supplyCode ||= matchedSupply.codigo ?? ''
  ingredient.supplyUnitBase = matchedSupply.unidadBase
  ingredient.supplyCategoryName ||= matchedSupply.category?.nombre ?? ''
  ingredient.supplyTagsText ||= tagsToText(matchedSupply.tags)
  ingredient.supplyCostoReferencial ??= matchedSupply.costoReferencial
  ingredient.supplyMermaPorcentaje ??= matchedSupply.mermaPorcentaje
}

function saveIngredientDraft() {
  hydrateIngredientFromCatalog(ingredientDraft)

  const nextIngredient = {
    supplyName: ingredientDraft.supplyName.trim(),
    supplyDescription: ingredientDraft.supplyDescription.trim(),
    supplyCode: ingredientDraft.supplyCode.trim(),
    supplyUnitBase: ingredientDraft.supplyUnitBase,
    supplyCategoryName: ingredientDraft.supplyCategoryName.trim(),
    supplyTagsText: ingredientDraft.supplyTagsText.trim(),
    supplyCostoReferencial: ingredientDraft.supplyCostoReferencial,
    supplyMermaPorcentaje: ingredientDraft.supplyMermaPorcentaje,
    grupo: ingredientDraft.grupo.trim(),
    cantidad: ingredientDraft.cantidad,
    unidad: ingredientDraft.unidad,
    notas: ingredientDraft.notas.trim(),
    opcional: ingredientDraft.opcional
  } satisfies RecipeIngredientFormState

  if (editingIngredientIndex.value === null) {
    state.recipe.ingredients.push(nextIngredient)
  } else if (state.recipe.ingredients[editingIngredientIndex.value]) {
    state.recipe.ingredients[editingIngredientIndex.value] = nextIngredient
  }

  closeIngredientModal()
}

watch(
  () => props.item,
  (item) => {
    syncState(item)
  },
  { immediate: true }
)

watch(
  () => ingredientModalOpen.value,
  (isOpen) => {
    if (!isOpen) {
      editingIngredientIndex.value = null
      syncIngredientDraft()
    }
  }
)

const isDirty = computed(() => JSON.stringify(state) !== initialSnapshot.value)

watch(
  () => isDirty.value,
  (value) => {
    emit('dirty-change', value)
  },
  { immediate: true }
)

async function onSubmit() {
  if (isSubmitting.value) {
    return
  }

  resetValidationState()

  const payload: FoodCatalogItemInput = {
    nombre: state.nombre.trim(),
    descripcion: state.descripcion.trim(),
    calorias: Number(state.calorias) || 0,
    imagen: state.imagen.trim(),
    tipo: state.tipo?.trim() ?? '',
    recipe: recipeHasContent(state.recipe)
      ? {
          status: state.recipe.status,
          porciones: toNullableNumber(state.recipe.porciones),
          rendimientoCantidad: toNullableNumber(state.recipe.rendimientoCantidad),
          rendimientoUnidad: state.recipe.rendimientoUnidad ?? null,
          tiempoPreparacionMin: toNullableNumber(state.recipe.tiempoPreparacionMin),
          tiempoCoccionMin: toNullableNumber(state.recipe.tiempoCoccionMin),
          instrucciones: state.recipe.instrucciones.trim(),
          notas: state.recipe.notas.trim(),
          ingredients: state.recipe.ingredients
            .filter(ingredientHasContent)
            .map(ingredient => ({
              supplyName: ingredient.supplyName.trim(),
              supplyDescription: ingredient.supplyDescription.trim(),
              supplyCode: ingredient.supplyCode.trim() || null,
              supplyUnitBase: ingredient.supplyUnitBase,
              supplyCategoryName: ingredient.supplyCategoryName.trim() || null,
              supplyTags: textToTags(ingredient.supplyTagsText),
              supplyCostoReferencial: toNullableNumber(ingredient.supplyCostoReferencial),
              supplyMermaPorcentaje: toNullableNumber(ingredient.supplyMermaPorcentaje),
              grupo: ingredient.grupo.trim() || null,
              cantidad: Number(ingredient.cantidad) || 0,
              unidad: ingredient.unidad,
              notas: ingredient.notas.trim(),
              opcional: ingredient.opcional
            }))
        }
      : null
  }

  const parsed = foodCatalogItemInputSchema.safeParse(payload)

  if (!parsed.success) {
    parsed.error.issues.forEach((issue) => {
      const fieldName = issue.path[0]

      if (typeof fieldName === 'string' && fieldName in fieldErrors && fieldName !== 'recipe') {
        const typedFieldName = fieldName as Exclude<FieldErrorKey, 'recipe'>
        if (!fieldErrors[typedFieldName]) {
          fieldErrors[typedFieldName] = issue.message
        }
        return
      }

      recipeIssues.value.push(issue.message)
    })

    recipeIssues.value = Array.from(new Set(recipeIssues.value))
    fieldErrors.recipe = recipeIssues.value[0] ?? ''
    showValidationToast()
    return
  }

  const duplicateItem = findDuplicateName(parsed.data.nombre)

  if (duplicateItem) {
    fieldErrors.nombre = 'Ya existe un platillo con ese nombre.'
    showValidationToast()
    return
  }

  isSubmitting.value = true

  try {
    await saveFoodCatalogItem(parsed.data, props.item?.id)

    toast.add({
      title: props.mode === 'edit' ? 'Platillo actualizado' : 'Platillo creado',
      description:
        props.mode === 'edit'
          ? 'Los cambios del platillo y su receta ya quedaron guardados.'
          : 'Ya puedes usar este platillo y su receta dentro de tus menús.',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })

    initialSnapshot.value = JSON.stringify(state)
    emit('dirty-change', false)
    emit('saved')
  } catch (error) {
    errorMessage.value = error instanceof Error
      ? error.message
      : 'No se pudo guardar el platillo.'

    toast.add({
      title: 'Error al guardar',
      description: errorMessage.value,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UForm
    :id="formId"
    :state="state"
    :errors="formErrors"
    class="grid items-start gap-6 2xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]"
    @submit.prevent="onSubmit"
  >
    <div class="space-y-6">
      <UCard class="app-surface-soft" :ui="{ body: 'p-5 sm:p-6' }">
        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-notebook-tabs"
              class="size-4 text-primary"
            />
            <h4 class="text-sm font-semibold text-highlighted">
              Menús vinculados
            </h4>
          </div>

          <div v-if="item?.linkedMenus?.length" class="space-y-2">
            <p
              v-if="item.linkedMenus.length === 1"
              class="text-sm text-muted"
            >
              Este platillo aparece actualmente en el siguiente menú:
            </p>

            <UAlert
              v-else
              color="warning"
              variant="subtle"
              icon="i-lucide-triangle-alert"
              title="Este platillo aparece en más de un menú"
              description="Revisa los menús vinculados porque este platillo ya se está usando."
            />

            <ul class="space-y-2">
              <li v-for="menu in item.linkedMenus" :key="menu.id">
                <UButton
                  :to="`/menu/${menu.id}`"
                  color="primary"
                  variant="subtle"
                  block
                  class="justify-start"
                  :ui="{ base: 'justify-start px-3 py-2 text-sm font-normal' }"
                  trailing-icon="i-lucide-arrow-up-right"
                >
                  {{ menu.name }}
                </UButton>
              </li>
            </ul>
          </div>

          <p v-else class="text-sm text-muted">
            {{
              mode === 'edit'
                ? 'Este platillo todavía no aparece en ningún menú.'
                : 'Cuando guardes el platillo y lo uses en un menú, aparecerá aquí.'
            }}
          </p>
        </div>
      </UCard>

      <UCard class="app-surface self-start" :ui="{ body: 'p-6' }">
        <div class="space-y-1">
          <h2 class="text-xl font-semibold text-highlighted">
            {{ mode === 'edit' ? 'Editar información del platillo' : 'Información del nuevo platillo' }}
          </h2>
          <p class="text-sm text-muted">
            El catálogo alimenta el editor de menús y ahora también centraliza la receta operativa del platillo.
          </p>
        </div>

        <div class="mt-4 space-y-5">
          <UAlert
            v-if="errorMessage"
            color="error"
            variant="soft"
            icon="i-lucide-circle-alert"
            title="No se pudo guardar"
            :description="errorMessage"
          />

          <Skeleton
            name="admin-food-catalog-edit-fields"
            :initial-bones="fieldsSkeleton"
            :loading="loadingFields"
          >
            <div class="grid gap-5">
              <UFormField
                name="nombre"
                :error="false"
                label="Nombre"
                class="min-w-0"
                :ui="{ label: 'font-semibold text-highlighted' }"
              >
                <UInput
                  v-model="state.nombre"
                  class="w-full"
                  :color="fieldErrors.nombre ? 'error' : 'neutral'"
                  size="xl"
                  placeholder="Ej. Bowl de pollo con arroz integral"
                />
              </UFormField>

              <UFormField
                name="tipo"
                :error="false"
                label="Tipo"
                class="min-w-0"
                :ui="{ label: 'font-semibold text-highlighted' }"
              >
                <USelect
                  v-model="state.tipo"
                  :items="foodTypeOptions"
                  class="w-full"
                  :color="fieldErrors.tipo ? 'error' : 'primary'"
                  size="xl"
                  placeholder="Selecciona un tipo"
                />
              </UFormField>

              <UFormField
                name="descripcion"
                label="Descripción"
                class="min-w-0"
                :ui="{ label: 'font-semibold text-highlighted' }"
              >
                <UTextarea
                  v-model="state.descripcion"
                  class="w-full"
                  :rows="5"
                  autoresize
                  placeholder="Describe rápidamente el platillo, ingredientes o notas internas."
                />
              </UFormField>

              <div class="grid gap-5 md:grid-cols-2">
                <UFormField
                  name="calorias"
                  label="Calorías"
                  class="min-w-0"
                  :ui="{ label: 'font-semibold text-highlighted' }"
                >
                  <UInput
                    v-model.number="state.calorias"
                    class="w-full"
                    type="number"
                    min="0"
                    size="xl"
                    placeholder="0"
                  />
                </UFormField>

                <UFormField
                  name="imagen"
                  label="URL de imagen"
                  class="min-w-0"
                  :ui="{ label: 'font-semibold text-highlighted' }"
                >
                  <UInput
                    v-model="state.imagen"
                    class="w-full"
                    type="url"
                    size="xl"
                    placeholder="https://..."
                  />
                </UFormField>
              </div>
            </div>
          </Skeleton>
        </div>

        <div
          v-if="item || !hideSubmit"
          class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p v-if="item" class="text-sm text-muted">
            Última actualización: {{ formatDateTime(item.updatedAt) }}
          </p>

          <UButton
            v-if="!hideSubmit"
            type="submit"
            size="lg"
            icon="i-lucide-save"
            :loading="isSubmitting"
          >
            {{ mode === 'edit' ? 'Guardar cambios' : 'Crear platillo' }}
          </UButton>
        </div>
      </UCard>

      <UCard class="app-surface" :ui="{ body: 'p-5 sm:p-6' }">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="space-y-1">
            <h2 class="text-xl font-semibold text-highlighted">
              Receta e insumos
            </h2>
            <p class="text-sm text-muted">
              Captura la receta base del platillo con cantidades, unidad, categoría y tags por insumo.
            </p>
          </div>

          <UButton
            color="primary"
            variant="soft"
            icon="i-lucide-plus"
            class="cursor-pointer"
            @click="openCreateIngredientModal"
          >
            Agregar insumo
          </UButton>
        </div>

        <div class="mt-5 space-y-5">
          <UAlert
            v-if="recipeIssues.length"
            color="warning"
            variant="soft"
            icon="i-lucide-triangle-alert"
            title="Revisa la receta"
            :description="recipeIssues.join(' ')"
          />

          <div class="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            <UFormField label="Estado de receta" :ui="{ label: 'font-semibold text-highlighted' }">
              <USelect
                v-model="state.recipe.status"
                :items="recipeStatusOptions"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Porciones" :ui="{ label: 'font-semibold text-highlighted' }">
              <UInput
                v-model.number="state.recipe.porciones"
                class="w-full"
                type="number"
                min="1"
                placeholder="Ej. 1"
              />
            </UFormField>

            <UFormField label="Tiempo de preparación (min)" :ui="{ label: 'font-semibold text-highlighted' }">
              <UInput
                v-model.number="state.recipe.tiempoPreparacionMin"
                class="w-full"
                type="number"
                min="0"
                placeholder="0"
              />
            </UFormField>

            <UFormField label="Tiempo de cocción (min)" :ui="{ label: 'font-semibold text-highlighted' }">
              <UInput
                v-model.number="state.recipe.tiempoCoccionMin"
                class="w-full"
                type="number"
                min="0"
                placeholder="0"
              />
            </UFormField>

            <UFormField label="Rendimiento" :ui="{ label: 'font-semibold text-highlighted' }">
              <UInput
                v-model.number="state.recipe.rendimientoCantidad"
                class="w-full"
                type="number"
                min="0"
                step="0.01"
                placeholder="Ej. 350"
              />
            </UFormField>

            <UFormField label="Unidad de rendimiento" :ui="{ label: 'font-semibold text-highlighted' }">
              <USelect
                v-model="state.recipe.rendimientoUnidad"
                :items="unitOptions"
                class="w-full"
                placeholder="Selecciona una unidad"
              />
            </UFormField>
          </div>

          <div class="grid gap-5 lg:grid-cols-2">
            <UFormField label="Instrucciones" :ui="{ label: 'font-semibold text-highlighted' }">
              <UTextarea
                v-model="state.recipe.instrucciones"
                class="w-full"
                :rows="6"
                placeholder="Detalla pasos, orden de producción y puntos críticos."
              />
            </UFormField>

            <UFormField label="Notas operativas" :ui="{ label: 'font-semibold text-highlighted' }">
              <UTextarea
                v-model="state.recipe.notas"
                class="w-full"
                :rows="6"
                placeholder="Notas internas, empaque, reposo, conservación o montaje."
              />
            </UFormField>
          </div>

          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
                Lista de insumos
              </h3>
              <span class="text-sm text-muted">
                {{ ingredientCount }} {{ ingredientCount === 1 ? 'insumo' : 'insumos' }}
              </span>
            </div>

            <div v-if="!state.recipe.ingredients.length" class="rounded-none border border-dashed border-default p-4 text-sm text-muted">
              Agrega el primer insumo para empezar a construir la receta.
            </div>

            <div class="overflow-hidden rounded-none border border-default bg-default/40">
              <article
                v-for="(ingredient, index) in state.recipe.ingredients"
                :key="`ingredient-${index}`"
                class="border-b border-default/70 px-4 py-3.5 last:border-b-0"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0 flex-1 space-y-1.5">
                    <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span class="text-sm font-medium tabular-nums text-primary">
                        {{ Number(index) + 1 }}.
                      </span>
                      <h4 class="text-base leading-6 text-highlighted">
                        <span class="font-semibold">
                          {{ ingredient.cantidad ?? 0 }} {{ formatRecipeUnitLabel(ingredient.unidad, ingredient.cantidad) }}
                        </span>
                        <span class="text-muted">
                          de
                        </span>
                        <span class="font-semibold">
                          {{ ingredient.supplyName || 'insumo sin nombre' }}
                        </span>
                      </h4>
                      <span v-if="ingredient.opcional" class="text-sm text-warning">
                        opcional
                      </span>
                    </div>

                    <p
                      v-if="ingredient.supplyDescription || ingredient.notas || ingredient.supplyCategoryName || ingredient.grupo"
                      class="text-sm leading-6 text-muted"
                    >
                      {{ ingredient.supplyDescription || ingredient.notas || ingredient.supplyCategoryName || ingredient.grupo }}
                    </p>
                  </div>

                  <div class="ml-4 flex shrink-0 items-center gap-2 self-start">
                    <UButton
                      color="primary"
                      variant="ghost"
                      class="cursor-pointer"
                      @click="openEditIngredientModal(index)"
                    >
                      Editar
                    </UButton>

                    <UButton
                      color="error"
                      variant="ghost"
                      class="cursor-pointer"
                      @click="removeIngredient(index)"
                    >
                      Quitar
                    </UButton>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>

        <datalist id="supply-items-list">
          <option
            v-for="supply in supplyItems"
            :key="supply.id"
            :value="supply.nombre"
          />
        </datalist>

        <datalist id="supply-categories-list">
          <option
            v-for="category in supplyCategories"
            :key="category.id"
            :value="category.nombre"
          />
        </datalist>
      </UCard>
    </div>

    <UModal
      v-model:open="ingredientModalOpen"
      :title="isCreatingIngredient ? 'Agregar insumo' : 'Modificar insumo'"
      :description="isCreatingIngredient ? 'Captura todos los detalles del insumo que formará parte de la receta.' : 'Actualiza la información operativa y de receta para este insumo.'"
      :ui="{ content: 'max-w-4xl' }"
    >
      <template #body>
        <div class="space-y-4">
          <div class="grid gap-4 lg:grid-cols-2">
            <UFormField label="Insumo" :ui="{ label: 'font-semibold text-highlighted' }">
              <UInput
                v-model="ingredientDraft.supplyName"
                list="supply-items-list"
                placeholder="Ej. Pechuga de pollo"
                @blur="hydrateIngredientFromCatalog(ingredientDraft)"
              />
            </UFormField>

            <UFormField label="Categoría" :ui="{ label: 'font-semibold text-highlighted' }">
              <UInput
                v-model="ingredientDraft.supplyCategoryName"
                list="supply-categories-list"
                placeholder="Ej. Proteínas"
              />
            </UFormField>

            <UFormField label="Cantidad" :ui="{ label: 'font-semibold text-highlighted' }">
              <UInput
                v-model.number="ingredientDraft.cantidad"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
              />
            </UFormField>

            <UFormField label="Unidad de receta" :ui="{ label: 'font-semibold text-highlighted' }">
              <USelect
                v-model="ingredientDraft.unidad"
                :items="unitOptions"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Unidad base del insumo" :ui="{ label: 'font-semibold text-highlighted' }">
              <USelect
                v-model="ingredientDraft.supplyUnitBase"
                :items="unitOptions"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Grupo" :ui="{ label: 'font-semibold text-highlighted' }">
              <UInput
                v-model="ingredientDraft.grupo"
                placeholder="Ej. Marinada, salsa, topping"
              />
            </UFormField>

            <UFormField label="Código interno" :ui="{ label: 'font-semibold text-highlighted' }">
              <UInput
                v-model="ingredientDraft.supplyCode"
                placeholder="SKU o código opcional"
              />
            </UFormField>

            <UFormField label="Tags" :ui="{ label: 'font-semibold text-highlighted' }">
              <UInput
                v-model="ingredientDraft.supplyTagsText"
                placeholder="pollo, proteina, refrigerado"
              />
            </UFormField>

            <UFormField label="Costo referencial" :ui="{ label: 'font-semibold text-highlighted' }">
              <UInput
                v-model.number="ingredientDraft.supplyCostoReferencial"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </UFormField>

            <UFormField label="Merma %" :ui="{ label: 'font-semibold text-highlighted' }">
              <UInput
                v-model.number="ingredientDraft.supplyMermaPorcentaje"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="0"
              />
            </UFormField>
          </div>

          <div class="grid gap-4">
            <UFormField label="Descripción del insumo" :ui="{ label: 'font-semibold text-highlighted' }">
              <UTextarea
                v-model="ingredientDraft.supplyDescription"
                :rows="3"
                autoresize
                placeholder="Marca, corte, presentación o cualquier detalle útil para compras y producción."
              />
            </UFormField>

            <UFormField label="Notas del ingrediente" :ui="{ label: 'font-semibold text-highlighted' }">
              <UTextarea
                v-model="ingredientDraft.notas"
                :rows="2"
                autoresize
                placeholder="Indicaciones puntuales para este ingrediente en la receta."
              />
            </UFormField>

            <UCheckbox
              v-model="ingredientDraft.opcional"
              label="Este insumo es opcional"
            />
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <UButton color="neutral" variant="ghost" class="cursor-pointer" @click="closeIngredientModal">
            Cancelar
          </UButton>
          <UButton color="primary" icon="i-lucide-save" class="cursor-pointer" @click="saveIngredientDraft">
            {{ isCreatingIngredient ? 'Agregar insumo' : 'Guardar detalles' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <div class="grid content-start gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] 2xl:grid-cols-1 2xl:gap-6">
      <Skeleton
        name="admin-food-catalog-edit-sidebar"
        :initial-bones="sidebarSkeleton"
        :loading="loadingSidebar"
      >
        <div class="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] 2xl:grid-cols-1 2xl:gap-6">
          <UCard class="app-surface-soft" :ui="{ body: 'space-y-5 p-6' }">
            <div class="overflow-hidden rounded-none border border-default/70 bg-default">
              <div
                v-if="state.imagen"
                class="aspect-[4/3] overflow-hidden rounded-none"
              >
                <img
                  :src="state.imagen"
                  :alt="state.nombre || 'Vista previa del platillo'"
                  class="h-full w-full object-cover"
                >
              </div>
              <div
                v-else
                class="flex aspect-[4/3] items-center justify-center rounded-none bg-[radial-gradient(circle_at_top,#00dc8220,transparent_55%)] text-muted"
              >
                <div class="text-center">
                  <UIcon name="i-lucide-image" class="mx-auto mb-2 size-8" />
                  <p class="text-sm">
                    Agrega una imagen para verla aquí
                  </p>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <UBadge color="primary" variant="subtle">
                  {{ state.tipo || 'Sin tipo' }}
                </UBadge>
                <UBadge color="neutral" variant="soft">
                  {{ state.calorias || 0 }} kcal
                </UBadge>
                <UBadge color="warning" variant="soft">
                  {{ formatEnumLabel(state.recipe.status) }}
                </UBadge>
              </div>

              <h3 class="text-lg font-semibold text-highlighted">
                {{ state.nombre || 'Nombre pendiente' }}
              </h3>
              <p class="text-sm text-toned">
                {{
                  state.descripcion
                    || 'Aquí verás un resumen rápido del platillo mientras lo capturas.'
                }}
              </p>
            </div>
          </UCard>
        </div>
      </Skeleton>
    </div>
  </UForm>
</template>
