<script setup lang="ts">
import type { FormError } from '@nuxt/ui'
import type { PlanDetail, PlanInput, PlanType } from '~~/types/types'
import { planInputSchema } from '~~/types/menuSchema'
import { PLAN_TYPE_VALUES } from '~~/types/types'

type PlanFormState = {
  nombre: string
  slug: string
  precio: number | null
  dishCount: number | null
  tipo: PlanType
  isActive: boolean
  tagsText: string
  notas: string
}

const props = withDefaults(defineProps<{
  plan?: PlanDetail | null
  mode: 'create' | 'edit'
  formId?: string
  hideSubmit?: boolean
}>(), {
  plan: null,
  formId: 'admin-plan-form',
  hideSubmit: false
})

const emit = defineEmits<{
  'saved': [value: PlanDetail]
  'dirty-change': [value: boolean]
  'validity-change': [value: boolean]
  'submit-state-change': [value: boolean]
}>()

const toast = useToast()
const { savePlan } = usePlans()

const state = reactive<PlanFormState>({
  nombre: props.plan?.nombre ?? '',
  slug: props.plan?.slug ?? '',
  precio: props.plan?.precio ?? null,
  dishCount: props.plan?.dishCount ?? null,
  tipo: props.plan?.tipo ?? 'DESAYUNO',
  isActive: props.plan?.isActive ?? true,
  tagsText: props.plan?.tags.join(', ') ?? '',
  notas: props.plan?.notas ?? ''
})

const fieldErrors = reactive<Record<keyof PlanFormState, string>>({
  nombre: '',
  slug: '',
  precio: '',
  dishCount: '',
  tipo: '',
  isActive: '',
  tagsText: '',
  notas: ''
})

const typeOptions = PLAN_TYPE_VALUES.map(value => ({
  label: formatPlanType(value),
  value
}))
const sectionCardUi = {
  root: 'overflow-hidden rounded-[28px] border border-default/70 ring-0 divide-y-0 bg-elevated/40 shadow-sm shadow-black/5 backdrop-blur-sm',
  body: 'space-y-6 p-6 sm:p-7'
}
const fieldUi = {
  label: 'font-semibold text-highlighted',
  description: 'text-sm leading-6 text-muted',
  error: 'mt-2'
}

function syncState(plan?: PlanDetail | null) {
  state.nombre = plan?.nombre ?? ''
  state.slug = plan?.slug ?? ''
  state.precio = plan?.precio ?? null
  state.dishCount = plan?.dishCount ?? null
  state.tipo = plan?.tipo ?? 'DESAYUNO'
  state.isActive = plan?.isActive ?? true
  state.tagsText = plan?.tags.join(', ') ?? ''
  state.notas = plan?.notas ?? ''
}

const generatedSlug = computed(() => slugify(state.slug.trim() || state.nombre))
const payload = computed<PlanInput>(() => ({
  nombre: state.nombre.trim(),
  slug: state.slug.trim() || null,
  precio: state.precio ?? 0,
  dishCount: state.dishCount ?? 0,
  tipo: state.tipo,
  isActive: state.isActive,
  tags: state.tagsText
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean),
  notas: state.notas.trim()
}))
const initialSnapshot = computed(() => serializePayload(getInitialPayload()))
const currentSnapshot = computed(() => serializePayload(payload.value))
const hasUnsavedChanges = computed(() => currentSnapshot.value !== initialSnapshot.value)
const validationResult = computed(() => planInputSchema.safeParse(payload.value))
const canSubmit = computed(() => validationResult.value.success)
const isSubmitting = ref(false)

const formErrors = computed<FormError[]>(() =>
  (Object.entries(fieldErrors) as Array<[keyof PlanFormState, string]>)
    .filter(([, message]) => Boolean(message))
    .map(([name, message]) => ({ name, message }))
)

function getInitialPayload(): PlanInput {
  return {
    nombre: props.plan?.nombre ?? '',
    slug: props.plan?.slug ?? null,
    precio: props.plan?.precio ?? 0,
    dishCount: props.plan?.dishCount ?? 0,
    tipo: props.plan?.tipo ?? 'DESAYUNO',
    isActive: props.plan?.isActive ?? true,
    tags: props.plan?.tags ?? [],
    notas: props.plan?.notas ?? ''
  }
}

function serializePayload(value: PlanInput) {
  return JSON.stringify({
    ...value,
    tags: [...value.tags].sort()
  })
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function clearFieldErrors() {
  Object.keys(fieldErrors).forEach((key) => {
    fieldErrors[key as keyof PlanFormState] = ''
  })
}

async function onSubmit() {
  if (isSubmitting.value) {
    return
  }

  clearFieldErrors()

  if (!validationResult.value.success) {
    validationResult.value.error.issues.forEach((issue) => {
      const fieldName = issue.path[0]

      if (typeof fieldName === 'string' && fieldName in fieldErrors && !fieldErrors[fieldName as keyof PlanFormState]) {
        fieldErrors[fieldName as keyof PlanFormState] = issue.message
      }
    })

    toast.add({
      title: 'El plan no se pudo guardar',
      description: 'Revisa los campos obligatorios antes de continuar.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  isSubmitting.value = true

  try {
    const saved = await savePlan(validationResult.value.data, props.mode === 'edit' ? props.plan?.id : undefined)
    toast.add({
      title: props.mode === 'create' ? 'Plan creado' : 'Plan actualizado',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    emit('saved', saved)
  } catch (error) {
    toast.add({
      title: 'No pudimos guardar el plan',
      description: error instanceof Error ? error.message : 'Intenta de nuevo en unos segundos.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    isSubmitting.value = false
  }
}

function formatPlanType(value: PlanType) {
  return {
    DESAYUNO: 'Desayuno',
    COMIDA: 'Comida',
    CENA: 'Cena'
  }[value]
}

watch(() => props.plan, value => syncState(value), { immediate: true })
watch(hasUnsavedChanges, value => emit('dirty-change', value), { immediate: true })
watch(canSubmit, value => emit('validity-change', value), { immediate: true })
watch(isSubmitting, value => emit('submit-state-change', value), { immediate: true })
</script>

<template>
  <UForm
    :id="formId"
    :state="state"
    :errors="formErrors"
    class="space-y-6"
    @submit.prevent="onSubmit"
  >
    <UCard :ui="sectionCardUi">
      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
          Identidad comercial
        </p>
        <h2 class="text-xl font-semibold text-primary">
          Base del plan
        </h2>
        <p class="text-sm leading-6 text-muted">
          Define el nombre, el tipo y el identificador con el que el equipo reconocerá este plan.
        </p>
      </div>

      <div class="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(15rem,0.8fr)]">
        <UFormField
          name="nombre"
          label="Nombre del plan"
          description="Ej. Plan Comida 10 platillos."
          :ui="fieldUi"
        >
          <UInput
            v-model="state.nombre"
            class="w-full"
            size="xl"
            placeholder="Plan Comida 10 platillos"
          />
        </UFormField>

        <UFormField
          name="slug"
          label="Slug"
          description="Si lo dejas vacío, se generará automáticamente."
          :ui="fieldUi"
        >
          <UInput
            v-model="state.slug"
            class="w-full"
            size="xl"
            placeholder="plan-comida-10-platillos"
          />
        </UFormField>

        <UFormField
          name="tipo"
          label="Tipo"
          description="Clasifica en qué tiempo de comida aplica."
          :ui="fieldUi"
        >
          <USelect
            v-model="state.tipo"
            :items="typeOptions"
            class="w-full"
            size="xl"
          />
        </UFormField>
      </div>

      <div class="rounded-2xl border border-default/60 bg-default/25 p-4 sm:p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Slug resultante
        </p>
        <p class="mt-2 font-medium text-highlighted">
          {{ generatedSlug || 'Se generará al guardar con un nombre válido' }}
        </p>
      </div>
    </UCard>

    <UCard :ui="sectionCardUi">
      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
          Configuración operativa
        </p>
        <h2 class="text-xl font-semibold text-primary">
          Precio y disponibilidad
        </h2>
        <p class="text-sm leading-6 text-muted">
          Ajusta el valor comercial del plan, su capacidad base y si debe estar visible para operación.
        </p>
      </div>

      <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.9fr)]">
        <UFormField
          name="precio"
          label="Precio"
          description="Monto base del plan en MXN."
          :ui="fieldUi"
        >
          <UInputNumber
            :model-value="state.precio ?? undefined"
            class="w-full"
            size="xl"
            orientation="vertical"
            :min="0"
            :step="10"
            placeholder="0"
            @update:model-value="(value) => state.precio = value === undefined ? null : Number(value)"
          />
        </UFormField>

        <UFormField
          name="dishCount"
          label="Cantidad de platillos"
          description="Número total de platillos incluidos."
          :ui="fieldUi"
        >
          <UInputNumber
            :model-value="state.dishCount ?? undefined"
            class="w-full"
            size="xl"
            orientation="vertical"
            :min="0"
            :step="1"
            placeholder="0"
            @update:model-value="(value) => state.dishCount = value === undefined ? null : Number(value)"
          />
        </UFormField>

        <div class="rounded-2xl border border-default/60 bg-default/25 p-4 sm:p-5">
          <UFormField
            name="isActive"
            label="Disponible"
            description="Úsalo para ocultar o habilitar el plan sin borrarlo."
            :ui="fieldUi"
          >
            <div class="flex items-center justify-between gap-4 rounded-2xl border border-default/60 bg-elevated/40 px-4 py-3">
              <div class="space-y-1">
                <p class="text-sm font-medium text-highlighted">
                  {{ state.isActive ? 'Plan activo' : 'Plan inactivo' }}
                </p>
                <p class="text-xs text-muted">
                  {{ state.isActive ? 'Disponible para operación y captura.' : 'Queda guardado pero fuera de uso.' }}
                </p>
              </div>

              <USwitch v-model="state.isActive" />
            </div>
          </UFormField>
        </div>
      </div>
    </UCard>

    <UCard :ui="sectionCardUi">
      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
          Contexto y notas
        </p>
        <h2 class="text-xl font-semibold text-primary">
          Etiquetas internas
        </h2>
        <p class="text-sm leading-6 text-muted">
          Agrega señales rápidas para segmentar el catálogo de planes y dejar instrucciones internas.
        </p>
      </div>

      <div class="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <UFormField
          name="tagsText"
          label="Tags"
          description="Sepáralos por coma para filtrar después."
          :ui="fieldUi"
        >
          <UInput
            v-model="state.tagsText"
            class="w-full"
            size="xl"
            placeholder="promocion, semanal, oficina"
          />
        </UFormField>

        <UFormField
          name="notas"
          label="Notas internas"
          description="Contexto adicional para el equipo administrativo."
          :ui="fieldUi"
        >
          <UTextarea
            v-model="state.notas"
            class="w-full"
            :rows="4"
            autoresize
            placeholder="Detalle de uso, restricciones o reglas internas del plan"
          />
        </UFormField>
      </div>
    </UCard>
  </UForm>
</template>
