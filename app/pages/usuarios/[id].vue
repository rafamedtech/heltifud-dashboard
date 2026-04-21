<script setup lang="ts">
import type { AdminUserDetail } from '~~/types/types'

definePageMeta({
  layout: 'admin',
  middleware: ['supabase-auth', 'admin-only']
})

const route = useRoute()
const leaveConfirmOpen = ref(false)
const editFormId = 'admin-user-edit-form'

useSeoMeta({
  title: 'Gestión de usuarios | Editar usuario | Heltifud Meal Preps',
  description: 'Edita un usuario existente dentro del panel administrativo de Heltifud Meal Preps.',
  robots: 'noindex, nofollow'
})

const {
  data: user,
  status,
  error
} = useLazyFetch<AdminUserDetail>(`/api/admin/users/${route.params.id}`, {
  key: `admin-user-${route.params.id}`
})

const isLoading = computed(() => status.value === 'idle' || status.value === 'pending')
const {
  hasUnsavedChanges,
  isSubmitting,
  canSubmit,
  submitButtonColor,
  submitButtonVariant,
  onDirtyChange,
  onValidityChange,
  onSubmitStateChange
} = useEditorState({ isLoading })

async function onSaved() {
  await navigateTo('/usuarios')
}

async function onBack() {
  if (hasUnsavedChanges.value) {
    leaveConfirmOpen.value = true
    return
  }

  await navigateTo('/usuarios')
}

async function leaveWithoutSaving() {
  leaveConfirmOpen.value = false
  await navigateTo('/usuarios')
}
</script>

<template>
  <main class="space-y-6">
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="No se pudo cargar el usuario"
      :description="error.data?.message || error.statusMessage || 'Intenta de nuevo en unos segundos.'"
      icon="i-lucide-circle-alert"
    />

    <AdminEditorPageShell
      v-else
      title="Editar usuario"
      description="Actualiza el perfil del usuario y mantén su estado operativo al día."
    >
      <template #actions>
        <UButton
          color="neutral"
          variant="subtle"
          icon="i-lucide-arrow-left"
          class="cursor-pointer"
          @click="onBack"
        >
          Regresar
        </UButton>

        <UButton
          type="submit"
          :form="editFormId"
          :disabled="!canSubmit"
          :color="submitButtonColor"
          :variant="submitButtonVariant"
          class="relative justify-center cursor-pointer"
        >
          <span class="inline-flex items-center gap-2 opacity-0">
            <UIcon name="i-lucide-save" class="size-4" />
            Guardar cambios
          </span>
          <span class="absolute inset-0 flex items-center justify-center gap-2">
            <UIcon
              :name="isSubmitting ? 'i-lucide-loader-circle' : 'i-lucide-save'"
              :class="['size-4', isSubmitting ? 'animate-spin' : '']"
            />
            <span>
              {{ isSubmitting ? 'Guardando...' : 'Guardar cambios' }}
            </span>
          </span>
        </UButton>
      </template>

      <AdminUserForm
        :form-id="editFormId"
        hide-submit
        :user="user"
        mode="edit"
        @saved="onSaved"
        @dirty-change="onDirtyChange"
        @validity-change="onValidityChange"
        @submit-state-change="onSubmitStateChange"
      />
    </AdminEditorPageShell>
  </main>

  <UModal
    v-model:open="leaveConfirmOpen"
    title="Salir sin guardar"
    description="Tienes cambios sin guardar. Si sales ahora, se perderán."
  >
    <template #body>
      <p class="text-sm text-muted">
        ¿Quieres regresar de todos modos?
      </p>
    </template>

    <template #footer>
      <div class="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <UButton
          color="neutral"
          variant="ghost"
          block
          class="cursor-pointer sm:w-auto"
          @click="leaveConfirmOpen = false"
        >
          Seguir editando
        </UButton>
        <UButton
          color="warning"
          icon="i-lucide-arrow-left"
          block
          class="cursor-pointer sm:w-auto"
          @click="leaveWithoutSaving"
        >
          Salir sin guardar
        </UButton>
      </div>
    </template>
  </UModal>
</template>
