<script setup lang="ts">
import type { WeeklyMenu } from '~~/types/types'
import Skeleton from 'boneyard-js/vue'
import initialBones from '~/bones/admin-menu-index.bones.json'
import { formatDate } from '~/utils/formatters'

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

const menuIndexSkeleton = initialBones as unknown as SkeletonResponsiveBones

const {
  data: menus,
  refresh,
  status
} = await useLazyFetch<WeeklyMenu[]>('/api/menu/all', {
  default: () => []
})

const isLoading = computed(() => status.value === 'pending')
const activeMenu = computed(() => menus.value.find(menu => menu.isActive) ?? null)
const latestCreatedMenu = computed(() => menus.value[0] ?? null)

const { deleteMenuOnDB, setActiveMenuOnDB } = useMenu()
const toast = useToast()
const deletingId = ref<string | null>(null)
const activatingId = ref<string | null>(null)
const pendingDeleteMenu = ref<WeeklyMenu | null>(null)
const deleteModalDescription = computed(() =>
  pendingDeleteMenu.value
    ? `Se eliminará "${pendingDeleteMenu.value.name}". Esta acción no se puede deshacer.`
    : undefined
)
const isDeleteModalOpen = computed({
  get: () => Boolean(pendingDeleteMenu.value),
  set: (value) => {
    if (!value) {
      pendingDeleteMenu.value = null
    }
  }
})

function requestDelete(menu: WeeklyMenu) {
  pendingDeleteMenu.value = menu
}

async function onDelete(id: string) {
  deletingId.value = id

  try {
    await deleteMenuOnDB(id)
    await refresh()
    toast.add({ title: 'Menú eliminado', color: 'success', icon: 'i-lucide-check-circle' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar'
    toast.add({ title: 'Error', description: message, color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    deletingId.value = null
    pendingDeleteMenu.value = null
  }
}

async function onSetActive(id: string) {
  activatingId.value = id

  try {
    await setActiveMenuOnDB(id)
    await refresh()
    toast.add({ title: 'Menú activo actualizado', color: 'success', icon: 'i-lucide-check-circle' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar el menú activo'
    toast.add({ title: 'Error', description: message, color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    activatingId.value = null
  }
}

definePageMeta({
  layout: 'admin',
  middleware: ['supabase-auth']
})

useSeoMeta({
  title: 'Gestión de menús semanales | Heltifud Meal Preps',
  description: 'Administra la rotación semanal de menús dentro del panel administrativo de Heltifud Meal Preps.',
  robots: 'noindex, nofollow'
})
</script>

<template>
  <main class="flex min-h-full flex-col space-y-6">
    <section class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="space-y-2">
        <div class="space-y-1">
          <h1 class="text-3xl font-semibold tracking-tight text-primary">
            Menú semanal
          </h1>
          <p class="max-w-2xl text-sm text-muted">
            Crea nuevos menús, edita los existentes y mantén visible la próxima rotación semanal.
          </p>
        </div>
      </div>

      <div class="flex w-full items-center gap-3 lg:w-auto lg:justify-end">
        <UButton
          to="/menu/crear-nuevo"
          icon="i-lucide-plus"
          class="w-full justify-center lg:w-auto"
          size="lg"
        >
          Nuevo menú
        </UButton>
      </div>
    </section>

    <Skeleton name="admin-menu-index" :initial-bones="menuIndexSkeleton" :loading="isLoading">
      <section class="space-y-4">
        <section class="grid gap-3 lg:grid-cols-3">
          <div class="app-surface-soft relative px-4 py-4">
            <p class="pr-20 text-xs uppercase tracking-[0.18em] text-muted">
              Menú activo
            </p>
            <UButton
              v-if="activeMenu"
              :to="`/menu/${activeMenu.id}`"
              size="sm"
              variant="outline"
              color="neutral"
              icon="i-lucide-square-arrow-out-up-right"
              class="absolute right-4 top-4"
            >
              Abrir
            </UButton>
            <div class="mt-3 space-y-1">
              <p class="line-clamp-1 text-base font-semibold text-highlighted">
                {{ activeMenu?.name ?? "Sin menú activo" }}
              </p>
              <p class="text-sm text-muted">
                {{
                  activeMenu
                    ? `${formatDate(activeMenu.startDate)} - ${formatDate(activeMenu.endDate)}`
                    : "Activa uno desde la lista inferior."
                }}
              </p>
            </div>
          </div>

          <div class="app-surface-soft px-4 py-4">
            <p class="text-xs uppercase tracking-[0.18em] text-muted">
              Último agregado
            </p>
            <div class="mt-3 space-y-1">
              <p class="line-clamp-1 text-base font-semibold text-highlighted">
                {{ latestCreatedMenu?.name ?? "Sin registros" }}
              </p>
              <p class="text-sm text-muted">
                {{
                  latestCreatedMenu
                    ? `Creado el ${formatDate(latestCreatedMenu.createdAt)}`
                    : "Crea tu primer menú semanal."
                }}
              </p>
            </div>
          </div>

          <div class="app-surface-soft px-4 py-4">
            <p class="text-xs uppercase tracking-[0.18em] text-muted">
              Menús creados
            </p>
            <div class="mt-3 space-y-1">
              <p class="text-2xl font-bold text-highlighted">
                {{ menus.length }}
              </p>
              <p class="text-sm text-muted">
                Total de menús semanales registrados.
              </p>
            </div>
          </div>
        </section>

        <UAlert
          v-if="!menus.length"
          title="Aún no hay menús"
          description="Empieza creando el primer menú semanal desde el botón de arriba."
          color="neutral"
          variant="soft"
          icon="i-lucide-notebook-tabs"
        />

        <section
          v-else
          class="grid grid-cols-1 gap-4 lg:grid-cols-2"
        >
          <UCard
            v-for="menu in menus"
            :key="menu.id"
            class="app-surface"
            :ui="{
              header: menu.isActive
                ? 'bg-primary/18 text-highlighted px-5 py-4 sm:px-6'
                : 'bg-default text-highlighted px-5 py-4 sm:px-6',
              body: 'px-5 py-5 sm:px-6',
              footer: 'px-5 py-4 sm:px-6'
            }"
          >
            <template #header>
              <section class="flex items-start justify-between gap-3">
                <div>
                  <h3
                    class="text-lg font-bold"
                    :class="menu.isActive ? 'text-primary' : 'text-highlighted'"
                  >
                    {{ menu.name }}
                  </h3>
                  <p
                    class="mt-1 text-sm"
                    :class="menu.isActive ? 'text-slate-700 dark:text-slate-200' : 'text-muted'"
                  >
                    {{ formatDate(menu.startDate) }} - {{ formatDate(menu.endDate) }}
                  </p>
                </div>

                <section class="flex flex-wrap justify-end gap-2">
                  <UButton
                    v-if="menu.isActive"
                    :to="'/menu-publico'"
                    variant="ghost"
                    icon="i-lucide-eye"
                    class="text-slate-700 hover:text-slate-700 dark:text-slate-200 dark:hover:text-slate-200"
                  >
                    Ver público
                  </UButton>
                  <UButton
                    :variant="menu.isActive ? 'solid' : 'soft'"
                    :color="menu.isActive ? 'success' : 'primary'"
                    icon="i-lucide-badge-check"
                    :loading="activatingId === menu.id"
                    :disabled="menu.isActive"
                    :class="menu.isActive ? 'text-white dark:text-black' : ''"
                    @click="onSetActive(menu.id)"
                  >
                    {{ menu.isActive ? "Activo" : "Activar" }}
                  </UButton>
                </section>
              </section>
            </template>

            <section class="space-y-3">
              <section class="grid grid-cols-2 gap-2 text-sm">
                <div class="rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-900">
                  <span class="text-muted">Creado</span>
                  <p class="font-medium text-highlighted">
                    {{ formatDate(menu.createdAt) }}
                  </p>
                </div>
                <div class="rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-900">
                  <span class="text-muted">Actualizado</span>
                  <p class="font-medium text-highlighted">
                    {{ formatDate(menu.updatedAt) }}
                  </p>
                </div>
              </section>
            </section>

            <template #footer>
              <section class="flex flex-wrap justify-end gap-2">
                <UButton
                  :to="`/menu/${menu.id}`"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-square-pen"
                >
                  Editar
                </UButton>
                <UButton
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash"
                  :loading="deletingId === menu.id"
                  @click="requestDelete(menu)"
                >
                  Eliminar
                </UButton>
              </section>
            </template>
          </UCard>
        </section>
      </section>
    </Skeleton>

    <UModal
      v-model:open="isDeleteModalOpen"
      title="Eliminar menú"
      :description="deleteModalDescription"
      :ui="{ content: 'max-w-md' }"
    >
      <template #body>
        <section class="space-y-4">
          <UAlert
            color="error"
            variant="soft"
            icon="i-lucide-triangle-alert"
            title="Confirma la eliminación"
            description="Si continúas, el menú semanal y su configuración asociada dejarán de estar disponibles."
          />
        </section>
      </template>

      <template #footer>
        <section class="flex w-full justify-end gap-2">
          <UButton
            variant="ghost"
            color="neutral"
            @click="pendingDeleteMenu = null"
          >
            Cancelar
          </UButton>
          <UButton
            color="error"
            :loading="deletingId === pendingDeleteMenu?.id"
            icon="i-lucide-trash"
            @click="pendingDeleteMenu && onDelete(pendingDeleteMenu.id)"
          >
            Eliminar menú
          </UButton>
        </section>
      </template>
    </UModal>
  </main>
</template>
