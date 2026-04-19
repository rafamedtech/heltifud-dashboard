<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { WeeklyMenu } from '~~/types/types';
import { formatDate } from '~/utils/formatters';
const UButton = resolveComponent('UButton')
const summaryCardPlaceholders = [1, 2, 3]
const tableRowPlaceholders = [1, 2, 3, 4, 5]

function formatMenuDateRangeValue(date: string) {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short'
  }).format(new Date(date))
}

function formatMenuDateRange(date: string, endDate: string) {
  return `${formatMenuDateRangeValue(date)} - ${formatMenuDateRangeValue(endDate)}`
}

const {
  data: menus,
  refresh,
  status,
} = await useLazyFetch<WeeklyMenu[]>('/api/menu/all', {
  default: () => [],
});

const isLoading = computed(() => status.value === 'pending');
const activeMenu = computed(
  () => menus.value.find((menu) => menu.isActive) ?? null,
);
const latestCreatedMenu = computed(() => menus.value[0] ?? null);
const summaryCards = computed(() => [
  {
    key: 'active-menu',
    title: 'Menú activo',
    description: activeMenu.value
      ? formatMenuDateRange(activeMenu.value.startDate, activeMenu.value.endDate)
      : 'Activa uno desde la lista inferior para publicarlo.',
    icon: 'i-lucide-badge-check',
    statIcon: 'i-lucide-eye',
    stat: activeMenu.value ? 'Visible ahora' : 'Sin menú activo',
    actionLabel: activeMenu.value ? 'Abrir' : 'Ver lista',
    actionTo: activeMenu.value ? `/menu/${activeMenu.value.id}` : '#menu-list',
  },
  {
    key: 'latest-menu',
    title: 'Último agregado',
    description: latestCreatedMenu.value
      ? latestCreatedMenu.value.name
      : 'Crea tu primer menú semanal para empezar a organizar la rotación.',
    icon: 'i-lucide-sparkles',
    statIcon: 'i-lucide-calendar-days',
    stat: latestCreatedMenu.value
      ? formatDate(latestCreatedMenu.value.createdAt)
      : 'Sin registros',
    actionLabel: latestCreatedMenu.value ? 'Editar' : 'Crear',
    actionTo: latestCreatedMenu.value
      ? `/menu/${latestCreatedMenu.value.id}`
      : '/menu/crear-nuevo',
  },
  {
    key: 'total-menus',
    title: 'Menús creados',
    description: 'Conteo total de menús semanales.',
    icon: 'i-lucide-files',
    statIcon: 'i-lucide-chart-column',
    stat: `${menus.value.length} ${menus.value.length === 1 ? 'registro' : 'registros'}`,
    actionLabel: 'Nuevo',
    actionTo: '/menu/crear-nuevo',
  },
]);

const columns: TableColumn<WeeklyMenu>[] = [
  {
    accessorKey: 'name',
    header: 'Menú',
    cell: ({ row }) =>
      h('p', { class: 'truncate py-1 font-medium text-highlighted' }, row.original.name)
  },
  {
    accessorKey: 'dateRange',
    header: 'Fechas',
    cell: ({ row }) =>
      h('p', { class: 'py-1 text-sm text-highlighted' }, `${formatMenuDateRangeValue(row.original.startDate)} - ${formatMenuDateRangeValue(row.original.endDate)}`)
  },
  {
    accessorKey: 'updatedAt',
    header: 'Actualizado',
    cell: ({ row }) => h('span', { class: 'text-sm text-toned' }, formatDate(row.original.updatedAt))
  },
  {
    id: 'details',
    header: () => h('div', { class: 'text-center' }, 'Detalles'),
    cell: ({ row }) =>
      h('div', { class: 'flex justify-center' }, [
        h(UButton, {
          to: `/menu/${row.original.id}`,
          color: 'primary',
          variant: 'ghost',
          icon: 'i-lucide-square-arrow-out-up-right',
          'aria-label': 'Ver detalles'
        })
      ])
  }
]

const tableMeta = {
  class: {
    tr: (row: { original: WeeklyMenu }) => row.original.isActive ? 'bg-success/10' : ''
  }
}

const { deleteMenuOnDB, setActiveMenuOnDB } = useMenu();
const toast = useToast();
const deletingId = ref<string | null>(null);
const activatingId = ref<string | null>(null);
const pendingDeleteMenu = ref<WeeklyMenu | null>(null);
const deleteModalDescription = computed(() =>
  pendingDeleteMenu.value
    ? `Se eliminará "${pendingDeleteMenu.value.name}". Esta acción no se puede deshacer.`
    : undefined,
);
const isDeleteModalOpen = computed({
  get: () => Boolean(pendingDeleteMenu.value),
  set: (value) => {
    if (!value) {
      pendingDeleteMenu.value = null;
    }
  },
});

function requestDelete(menu: WeeklyMenu) {
  pendingDeleteMenu.value = menu;
}

async function onDelete(id: string) {
  deletingId.value = id;

  try {
    await deleteMenuOnDB(id);
    await refresh();
    toast.add({
      title: 'Menú eliminado',
      color: 'success',
      icon: 'i-lucide-check-circle',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudo eliminar';
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
      icon: 'i-lucide-circle-alert',
    });
  } finally {
    deletingId.value = null;
    pendingDeleteMenu.value = null;
  }
}

async function onSetActive(id: string) {
  activatingId.value = id;

  try {
    await setActiveMenuOnDB(id);
    await refresh();
    toast.add({
      title: 'Menú activo actualizado',
      color: 'success',
      icon: 'i-lucide-check-circle',
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'No se pudo actualizar el menú activo';
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
      icon: 'i-lucide-circle-alert',
    });
  } finally {
    activatingId.value = null;
  }
}

definePageMeta({
  layout: 'admin',
  middleware: ['supabase-auth'],
});

useSeoMeta({
  title: 'Gestión de menús semanales | Heltifud Meal Preps',
  description:
    'Administra la rotación semanal de menús dentro del panel administrativo de Heltifud Meal Preps.',
  robots: 'noindex, nofollow',
});
</script>

<template>
  <main class="flex min-h-full flex-col space-y-6">
    <section
      class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
    >
      <div class="space-y-2">
        <div class="space-y-1">
          <h1 class="text-3xl font-semibold tracking-tight text-primary">
            Menú semanal
          </h1>
          <p class="max-w-2xl text-sm text-muted">
            Crea nuevos menús, edita los existentes y mantén visible la próxima
            rotación semanal.
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

    <section class="space-y-4">
      <section class="space-y-4">
        <section class="grid gap-3 lg:grid-cols-3">
          <UCard
            v-if="isLoading"
            v-for="placeholder in summaryCardPlaceholders"
            :key="`summary-skeleton-${placeholder}`"
            class="app-surface overflow-hidden"
            :ui="{
              root: 'rounded-2xl',
              body: 'flex min-h-[176px] flex-col p-4 sm:p-4.5',
            }"
          >
            <div class="size-9 animate-pulse rounded-lg bg-elevated" />
            <div class="mt-4 space-y-2">
              <div class="h-5 w-28 animate-pulse rounded-md bg-elevated" />
              <div class="h-4 w-full animate-pulse rounded-md bg-elevated" />
              <div class="h-4 w-3/4 animate-pulse rounded-md bg-elevated" />
            </div>
            <div class="mt-auto pt-5">
              <div class="border-t border-default/70 pt-3">
                <div class="flex items-center justify-between gap-3">
                  <div class="h-4 w-24 animate-pulse rounded-md bg-elevated" />
                  <div class="h-8 w-16 animate-pulse rounded-lg bg-elevated" />
                </div>
              </div>
            </div>
          </UCard>

          <UCard
            v-else
            v-for="card in summaryCards"
            :key="card.key"
            class="app-surface group relative overflow-hidden transition-colors duration-200 hover:border-default"
            :ui="{
              root: 'rounded-2xl',
              body: 'relative flex min-h-[176px] flex-col p-4 sm:p-4.5',
            }"
          >
            <div
              class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20"
            >
              <UIcon :name="card.icon" class="size-4" />
            </div>

            <div class="mt-4 space-y-2">
              <div class="space-y-1.5">
                <p class="text-base font-semibold text-highlighted">
                  {{ card.title }}
                </p>
                <p class="line-clamp-2 text-sm leading-5 text-muted">
                  {{ card.description }}
                </p>
              </div>
            </div>

            <div class="mt-auto pt-5">
              <div class="border-t border-default/70 pt-3">
                <div class="flex items-center justify-between gap-3">
                  <div class="flex min-w-0 items-center gap-2 text-muted">
                    <UIcon :name="card.statIcon" class="size-4 shrink-0" />
                    <span class="truncate text-sm">{{ card.stat }}</span>
                  </div>

                  <UButton
                    :to="card.actionTo"
                    size="sm"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-arrow-right"
                    trailing
                    :ui="{
                      base: 'rounded-lg px-2.5 text-muted hover:text-highlighted',
                    }"
                  >
                    {{ card.actionLabel }}
                  </UButton>
                </div>
              </div>
            </div>
          </UCard>
        </section>

        <UAlert
          v-if="!isLoading && !menus.length"
          title="Aún no hay menús"
          description="Empieza creando el primer menú semanal desde el botón de arriba."
          color="neutral"
          variant="soft"
          icon="i-lucide-notebook-tabs"
        />

        <section
          id="menu-list"
          v-else-if="!isLoading"
          class="space-y-4"
        >
          <UCard
            class="app-surface overflow-hidden"
            :ui="{ body: 'p-0 sm:p-0' }"
          >
            <div class="space-y-5 p-5 sm:p-6">
              <div class="space-y-1">
                <h2 class="text-lg font-semibold text-primary">
                  Menús registrados
                </h2>
              </div>

              <UTable
                :data="menus"
                :columns="columns"
                :meta="tableMeta"
                class="shrink-0"
                :ui="{
                  base: 'table-fixed border-separate border-spacing-0',
                  thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                  tbody: '[&>tr]:last:[&>td]:border-b-0',
                  th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r max-md:[&:nth-child(3)]:hidden',
                  td: 'border-b border-default align-top max-md:[&:nth-child(3)]:hidden'
                }"
              />
            </div>
          </UCard>
        </section>

        <section v-else class="space-y-4">
          <UCard
            class="app-surface overflow-hidden"
            :ui="{ body: 'p-0 sm:p-0' }"
          >
            <div class="space-y-5 p-5 sm:p-6">
              <div class="space-y-1">
                <h2 class="text-lg font-semibold text-primary">
                  Menús registrados
                </h2>
              </div>

              <div class="overflow-hidden rounded-xl border border-default/70">
                <div class="grid grid-cols-[minmax(0,1.8fr)_1fr_1fr_auto] gap-4 border-b border-default/70 bg-elevated/50 px-4 py-3">
                  <div class="h-4 w-20 animate-pulse rounded-md bg-default/70" />
                  <div class="h-4 w-16 animate-pulse rounded-md bg-default/70" />
                  <div class="h-4 w-16 animate-pulse rounded-md bg-default/70" />
                  <div class="ml-auto h-4 w-16 animate-pulse rounded-md bg-default/70" />
                </div>

                <div
                  v-for="placeholder in tableRowPlaceholders"
                  :key="`row-skeleton-${placeholder}`"
                  class="grid grid-cols-[minmax(0,1.8fr)_1fr_1fr_auto] gap-4 border-b border-default/70 px-4 py-4 last:border-b-0"
                >
                  <div class="space-y-2">
                    <div class="h-4 w-36 animate-pulse rounded-md bg-elevated" />
                  </div>
                  <div class="h-4 w-24 animate-pulse rounded-md bg-elevated" />
                  <div class="h-4 w-28 animate-pulse rounded-md bg-elevated" />
                  <div class="ml-auto h-8 w-8 animate-pulse rounded-lg bg-elevated" />
                </div>
              </div>
            </div>
          </UCard>
        </section>
      </section>
    </section>

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
