<script setup lang="ts">
import type { FormError } from '@nuxt/ui'
import type {
  AdminUserDetail,
  AdminUserInput,
  UserCustomerType,
  UserGender,
  UserRole,
  UserSource,
  UserStatus
} from '~~/types/types'
import { adminUserInputSchema } from '~~/types/menuSchema'
import {
  USER_CUSTOMER_TYPE_VALUES,
  USER_GENDER_VALUES,
  USER_ROLE_VALUES,
  USER_SOURCE_VALUES,
  USER_STATUS_VALUES
} from '~~/types/types'

type UserFormState = {
  email: string
  nombre: string
  apellidos: string
  telefono: string
  role: UserRole
  status: UserStatus
  source: UserSource | 'none'
  gender: UserGender | 'none'
  customerType: UserCustomerType | 'none'
  tagsText: string
  primaryAddress: string
  primaryAddress2: string
  notas: string
}

const props = withDefaults(defineProps<{
  user?: AdminUserDetail | null
  mode: 'create' | 'edit'
  formId?: string
  hideSubmit?: boolean
}>(), {
  user: null,
  formId: 'admin-user-form',
  hideSubmit: false
})

const emit = defineEmits<{
  'saved': [value: AdminUserDetail]
  'dirty-change': [value: boolean]
  'validity-change': [value: boolean]
  'submit-state-change': [value: boolean]
}>()

const toast = useToast()
const { saveAdminUser } = useAdminUsers()

const state = reactive<UserFormState>({
  email: props.user?.email ?? '',
  nombre: props.user?.nombre ?? '',
  apellidos: props.user?.apellidos ?? '',
  telefono: props.user?.telefono ?? '',
  role: props.user?.role ?? 'CLIENTE',
  status: props.user?.status ?? 'ACTIVO',
  source: props.user?.source ?? 'none',
  gender: props.user?.gender ?? 'none',
  customerType: props.user?.customerType ?? 'none',
  tagsText: props.user?.tags.join(', ') ?? '',
  primaryAddress: props.user?.primaryAddress ?? '',
  primaryAddress2: props.user?.primaryAddress2 ?? '',
  notas: props.user?.notas ?? ''
})

const fieldErrors = reactive<Record<keyof UserFormState, string>>({
  email: '',
  nombre: '',
  apellidos: '',
  telefono: '',
  role: '',
  status: '',
  source: '',
  gender: '',
  customerType: '',
  tagsText: '',
  primaryAddress: '',
  primaryAddress2: '',
  notas: ''
})

const roleOptions = USER_ROLE_VALUES.map(value => ({
  label: formatRole(value),
  value
}))
const statusOptions = USER_STATUS_VALUES.map(value => ({
  label: formatStatus(value),
  value
}))
const sourceOptions = [
  { label: 'Sin fuente', value: 'none' },
  ...USER_SOURCE_VALUES.map(value => ({
    label: formatSource(value),
    value
  }))
]
const genderOptions = [
  { label: 'Sin género', value: 'none' },
  ...USER_GENDER_VALUES.map(value => ({
    label: formatGender(value),
    value
  }))
]
const customerTypeOptions = [
  { label: 'Sin tipo', value: 'none' },
  ...USER_CUSTOMER_TYPE_VALUES.map(value => ({
    label: formatCustomerType(value),
    value
  }))
]
const sectionCardUi = {
  root: 'overflow-hidden rounded-[28px] border border-default/70 ring-0 divide-y-0 bg-elevated/40 shadow-sm shadow-black/5 backdrop-blur-sm',
  body: 'space-y-6 p-6 sm:p-7'
}
const fieldUi = {
  label: 'font-semibold text-highlighted',
  description: 'text-sm leading-6 text-muted',
  error: 'mt-2'
}

const payload = computed<AdminUserInput>(() => ({
  email: state.email.trim(),
  nombre: state.nombre.trim(),
  apellidos: state.apellidos.trim(),
  telefono: state.telefono.trim() || null,
  role: state.role,
  status: state.status,
  source: state.source === 'none' ? null : state.source,
  gender: state.gender === 'none' ? null : state.gender,
  customerType: state.customerType === 'none' ? null : state.customerType,
  tags: state.tagsText
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean),
  primaryAddress: state.primaryAddress.trim(),
  primaryAddress2: state.primaryAddress2.trim(),
  notas: state.notas.trim()
}))

const initialSnapshot = computed(() => serializePayload(getInitialPayload()))
const currentSnapshot = computed(() => serializePayload(payload.value))
const hasUnsavedChanges = computed(() => currentSnapshot.value !== initialSnapshot.value)
const validationResult = computed(() => adminUserInputSchema.safeParse(payload.value))
const canSubmit = computed(() => validationResult.value.success)
const isSubmitting = ref(false)

const formErrors = computed<FormError[]>(() =>
  (Object.entries(fieldErrors) as Array<[keyof UserFormState, string]>)
    .filter(([, message]) => Boolean(message))
    .map(([name, message]) => ({ name, message }))
)

function getInitialPayload(): AdminUserInput {
  return {
    email: props.user?.email ?? '',
    nombre: props.user?.nombre ?? '',
    apellidos: props.user?.apellidos ?? '',
    telefono: props.user?.telefono ?? null,
    role: props.user?.role ?? 'CLIENTE',
    status: props.user?.status ?? 'ACTIVO',
    source: props.user?.source ?? null,
    gender: props.user?.gender ?? null,
    customerType: props.user?.customerType ?? null,
    tags: props.user?.tags ?? [],
    primaryAddress: props.user?.primaryAddress ?? '',
    primaryAddress2: props.user?.primaryAddress2 ?? '',
    notas: props.user?.notas ?? ''
  }
}

function serializePayload(value: AdminUserInput) {
  return JSON.stringify({
    ...value,
    tags: [...value.tags].sort()
  })
}

function clearFieldErrors() {
  Object.keys(fieldErrors).forEach((key) => {
    fieldErrors[key as keyof UserFormState] = ''
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

      if (typeof fieldName === 'string' && fieldName in fieldErrors && !fieldErrors[fieldName as keyof UserFormState]) {
        fieldErrors[fieldName as keyof UserFormState] = issue.message
      }
    })

    toast.add({
      title: 'El usuario no se pudo guardar',
      description: 'Revisa los campos obligatorios antes de continuar.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  isSubmitting.value = true

  try {
    const saved = await saveAdminUser(validationResult.value.data, props.mode === 'edit' ? props.user?.id : undefined)
    toast.add({
      title: props.mode === 'create' ? 'Usuario creado' : 'Usuario actualizado',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    emit('saved', saved)
  } catch (error) {
    toast.add({
      title: 'No pudimos guardar el usuario',
      description: error instanceof Error ? error.message : 'Intenta de nuevo en unos segundos.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    isSubmitting.value = false
  }
}

function formatRole(value: UserRole) {
  return value === 'ADMIN' ? 'Administrador' : 'Cliente'
}

function formatStatus(value: UserStatus) {
  return {
    ACTIVO: 'Activo',
    PAUSADO: 'Pausado',
    INACTIVO: 'Inactivo',
    BLOQUEADO: 'Bloqueado'
  }[value]
}

function formatSource(value: UserSource) {
  return {
    ORGANICO: 'Orgánico',
    ADS: 'Ads',
    REFERIDO: 'Referido',
    OTRO: 'Otro'
  }[value]
}

function formatGender(value: UserGender) {
  return {
    MUJER: 'Mujer',
    HOMBRE: 'Hombre',
    OTRO: 'Otro',
    PREFIERE_NO_DECIR: 'Prefiere no decir'
  }[value]
}

function formatCustomerType(value: UserCustomerType) {
  return {
    VEGETARIANO: 'Vegetariano',
    NUTRIOLOGO: 'Nutriólogo',
    ESTANDAR: 'Estándar'
  }[value]
}

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
          Datos principales
        </p>
        <h2 class="text-xl font-semibold text-primary">
          Identidad y contacto
        </h2>
        <p class="text-sm leading-6 text-muted">
          Define la identidad base y el acceso administrativo o de cliente para este usuario.
        </p>
      </div>

      <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(15rem,0.8fr)]">
        <div class="rounded-2xl border border-default/60 bg-default/25 p-4 sm:p-5 xl:col-span-2">
          <div class="grid gap-4 md:grid-cols-2">
            <UFormField
              name="nombre"
              label="Nombre"
              description="Nombre visible en panel y seguimiento."
              :ui="fieldUi"
            >
              <UInput
                v-model="state.nombre"
                class="w-full"
                size="xl"
                placeholder="Sofía"
              />
            </UFormField>

            <UFormField
              name="apellidos"
              label="Apellidos"
              description="Apellidos o nombre comercial corto."
              :ui="fieldUi"
            >
              <UInput
                v-model="state.apellidos"
                class="w-full"
                size="xl"
                placeholder="López García"
              />
            </UFormField>
          </div>
        </div>

        <div class="rounded-2xl border border-default/60 bg-default/25 p-4 sm:p-5">
          <UFormField
            name="telefono"
            label="Teléfono"
            description="Canal rápido para operación."
            :ui="fieldUi"
          >
            <UInput
              v-model="state.telefono"
              class="w-full"
              size="xl"
              placeholder="664 123 4567"
            />
          </UFormField>
        </div>

        <UFormField
          name="email"
          label="Correo electrónico"
          description="Se usa como identificador principal del usuario."
          class="xl:col-span-2"
          :ui="fieldUi"
        >
          <UInput
            v-model="state.email"
            type="email"
            class="w-full"
            size="xl"
            placeholder="correo@dominio.com"
          />
        </UFormField>

        <UFormField
          name="tagsText"
          label="Tags"
          description="Separa por coma para crear grupos rápidos."
          :ui="fieldUi"
        >
          <UInput
            v-model="state.tagsText"
            class="w-full"
            size="xl"
            placeholder="vip, semana-1, nutri"
          />
        </UFormField>
      </div>
    </UCard>

    <UCard :ui="sectionCardUi">
      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
          Perfil comercial
        </p>
        <h2 class="text-xl font-semibold text-primary">
          Clasificación operativa
        </h2>
        <p class="text-sm leading-6 text-muted">
          Configura el rol, el estado y la clasificación del usuario dentro de la operación.
        </p>
      </div>

      <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-12">
        <div class="rounded-2xl border border-default/60 bg-default/25 p-4 sm:p-5 xl:col-span-7">
          <div class="grid gap-4 md:grid-cols-2">
            <UFormField
              name="role"
              label="Rol"
              description="Controla permisos de acceso."
              :ui="fieldUi"
            >
              <USelect
                v-model="state.role"
                :items="roleOptions"
                class="w-full"
                size="xl"
              />
            </UFormField>

            <UFormField
              name="status"
              label="Estado"
              description="Marca la disponibilidad actual."
              :ui="fieldUi"
            >
              <USelect
                v-model="state.status"
                :items="statusOptions"
                class="w-full"
                size="xl"
              />
            </UFormField>
          </div>
        </div>

        <div class="rounded-2xl border border-default/60 bg-default/25 p-4 sm:p-5 xl:col-span-5">
          <UFormField
            name="customerType"
            label="Tipo de cliente"
            description="Clasificación principal del servicio."
            :ui="fieldUi"
          >
            <USelect
              v-model="state.customerType"
              :items="customerTypeOptions"
              class="w-full"
              size="xl"
            />
          </UFormField>
        </div>

        <UFormField
          name="source"
          label="Fuente"
          description="Origen de captación del usuario."
          class="xl:col-span-6"
          :ui="fieldUi"
        >
          <USelect
            v-model="state.source"
            :items="sourceOptions"
            class="w-full"
            size="xl"
          />
        </UFormField>

        <UFormField
          name="gender"
          label="Género"
          description="Dato opcional para personalización."
          class="xl:col-span-6"
          :ui="fieldUi"
        >
          <USelect
            v-model="state.gender"
            :items="genderOptions"
            class="w-full"
            size="xl"
          />
        </UFormField>
      </div>
    </UCard>

    <UCard :ui="sectionCardUi">
      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
          Dirección y notas
        </p>
        <h2 class="text-xl font-semibold text-primary">
          Contexto operativo
        </h2>
        <p class="text-sm leading-6 text-muted">
          Guarda referencias rápidas para el equipo antes de modelar direcciones detalladas.
        </p>
      </div>

      <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)]">
        <UFormField
          name="primaryAddress"
          label="Dirección principal"
          description="Calle, colonia o referencia principal."
          :ui="fieldUi"
        >
          <UTextarea
            v-model="state.primaryAddress"
            class="w-full"
            :rows="3"
            autoresize
            placeholder="Calle, colonia o punto principal"
          />
        </UFormField>

        <UFormField
          name="primaryAddress2"
          label="Dirección secundaria"
          description="Complemento corto para entrega o seguimiento."
          :ui="fieldUi"
        >
          <UTextarea
            v-model="state.primaryAddress2"
            class="w-full"
            :rows="3"
            autoresize
            placeholder="Departamento, referencias o acceso"
          />
        </UFormField>

        <div class="rounded-2xl border border-default/60 bg-default/25 p-4 sm:p-5 xl:row-span-2">
          <UFormField
            name="notas"
            label="Notas internas"
            description="Visible para el equipo administrativo."
            :ui="fieldUi"
          >
            <UTextarea
              v-model="state.notas"
              class="w-full"
              :rows="8"
              autoresize
              placeholder="Observaciones del cliente, alertas o contexto operativo"
            />
          </UFormField>

          <div class="mt-4 rounded-2xl border border-dashed border-default/70 bg-elevated/30 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
              Tip interno
            </p>
            <p class="mt-2 text-sm leading-6 text-muted">
              Usa notas breves, accionables y fáciles de escanear para cocina, soporte o reparto.
            </p>
          </div>
        </div>

        <div class="rounded-2xl border border-default/60 bg-default/20 p-4 text-sm leading-6 text-muted xl:col-span-2">
          Este bloque resume contexto rápido. Si después agregamos direcciones completas, estas notas siguen sirviendo como guía operativa.
        </div>
      </div>
    </UCard>

    <div
      v-if="!hideSubmit"
      class="flex flex-col gap-3 rounded-[24px] border border-default/70 bg-elevated/30 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p class="text-sm leading-6 text-muted">
        Revisa identidad, clasificación y notas antes de guardar.
      </p>

      <div class="flex justify-end">
        <UButton type="submit" size="lg" icon="i-lucide-save">
          {{ mode === 'create' ? 'Crear usuario' : 'Guardar cambios' }}
        </UButton>
      </div>
    </div>
  </UForm>
</template>
