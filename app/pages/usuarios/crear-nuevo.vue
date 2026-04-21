<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['supabase-auth', 'admin-only']
})

const route = useRoute()
const leaveConfirmOpen = ref(false)
const createFormId = 'admin-user-create-form'
const {
  hasUnsavedChanges,
  isSubmitting,
  canSubmit,
  submitButtonColor,
  submitButtonVariant,
  onDirtyChange,
  onValidityChange,
  onSubmitStateChange
} = useEditorState()

useSeoMeta({
  title: 'Gestión de usuarios | Crear nuevo usuario | Heltifud Meal Preps',
  description: 'Crea un nuevo usuario dentro del panel administrativo de Heltifud Meal Preps.',
  robots: 'noindex, nofollow'
})

async function onSaved() {
  if (typeof route.query.returnTo === 'string') {
    await navigateTo(route.query.returnTo)
    return
  }

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
  <AdminEditorPageShell
    title="Nuevo usuario"
    description="Configura el perfil en un orden simple: datos principales, clasificación operativa y notas internas."
  >
    <template #actions>
      <UButton
        color="neutral"
        variant="subtle"
        icon="i-lucide-arrow-left"
        class="cursor-pointer"
        @click="onBack"
      >
        Volver a usuarios
      </UButton>

      <UButton
        type="submit"
        :form="createFormId"
        :disabled="!canSubmit"
        :color="submitButtonColor"
        :variant="submitButtonVariant"
        class="relative justify-center cursor-pointer"
      >
        <span class="inline-flex items-center gap-2 opacity-0">
          <UIcon name="i-lucide-save" class="size-4" />
          Crear usuario
        </span>
        <span class="absolute inset-0 flex items-center justify-center gap-2">
          <UIcon
            :name="isSubmitting ? 'i-lucide-loader-circle' : 'i-lucide-save'"
            :class="['size-4', isSubmitting ? 'animate-spin' : '']"
          />
          <span>
            {{ isSubmitting ? 'Guardando...' : 'Crear usuario' }}
          </span>
        </span>
      </UButton>
    </template>

    <AdminUserForm
      :form-id="createFormId"
      hide-submit
      mode="create"
      @saved="onSaved"
      @dirty-change="onDirtyChange"
      @validity-change="onValidityChange"
      @submit-state-change="onSubmitStateChange"
    />
  </AdminEditorPageShell>

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
