<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui';

const open = useCookie('sidebar-open');

const route = useRoute();
const colorMode = useColorMode();
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const toast = useToast();

const isSigningOut = ref(false);

const workspace = computed(() => ({
  label: 'Heltifud Admin',
  icon: 'i-lucide-utensils-crossed',
}));

const workspaceItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Panel administrativo',
      icon: 'i-lucide-layout-dashboard',
      to: '/',
    },
    {
      label: 'Ver menú público',
      icon: 'i-lucide-external-link',
      to: '/menu-publico',
    },
  ],
]);

function getMainItems(state: 'collapsed' | 'expanded') {
  const baseItems: NavigationMenuItem[] = [
    {
      label: 'Resumen',
      icon: 'i-lucide-layout-dashboard',
      to: '/',
      exact: true,
    },
    {
      label: 'Menús',
      icon: 'i-lucide-calendar-range',
      to: '/menu',
    },
    {
      label: 'Platillos',
      icon: 'i-lucide-chef-hat',
      to: '/platillos',
    },
  ];

  if (state === 'collapsed') {
    return [
      ...baseItems,
      {
        label: 'General',
        icon: 'i-lucide-sliders-horizontal',
        to: '/configuracion',
      },
    ] satisfies NavigationMenuItem[];
  }

  return [
    ...baseItems,
    {
      label: 'Configuración',
      icon: 'i-lucide-settings-2',
      defaultOpen: true,
      children: [
        {
          label: 'General',
          icon: 'i-lucide-sliders-horizontal',
          to: '/configuracion',
        },
        {
          label: 'Insumos',
          icon: 'i-lucide-package-search',
          to: '/configuracion/insumos',
        },
        {
          label: 'Categorías',
          icon: 'i-lucide-tags',
          to: '/configuracion/categorias-insumos',
        },
      ],
    },
  ] satisfies NavigationMenuItem[];
}

const supportItems = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Menú público',
    icon: 'i-lucide-eye',
    to: '/menu-publico',
  },
]);

const userMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      type: 'label',
      label: user.value?.email ?? 'Sin sesión',
      avatar: {
        icon: 'i-lucide-user',
        alt: user.value?.email ?? 'Admin',
      },
    },
  ],
  [
    {
      label: 'Ir a configuración',
      icon: 'i-lucide-settings-2',
      to: '/configuracion',
    },
    {
      label: 'Ver menú público',
      icon: 'i-lucide-external-link',
      to: '/menu-publico',
    },
  ],
  [
    {
      label: 'Apariencia',
      icon: 'i-lucide-sun-moon',
      children: [
        {
          label: 'Claro',
          icon: 'i-lucide-sun',
          type: 'checkbox',
          checked: colorMode.value === 'light',
          onUpdateChecked(checked: boolean) {
            if (checked) {
              colorMode.preference = 'light';
            }
          },
          onSelect(e: Event) {
            e.preventDefault();
          },
        },
        {
          label: 'Oscuro',
          icon: 'i-lucide-moon',
          type: 'checkbox',
          checked: colorMode.value === 'dark',
          onUpdateChecked(checked: boolean) {
            if (checked) {
              colorMode.preference = 'dark';
            }
          },
          onSelect(e: Event) {
            e.preventDefault();
          },
        },
      ],
    },
  ],
  [
    {
      label: 'Cerrar sesión',
      icon: 'i-lucide-log-out',
      color: 'error',
      disabled: isSigningOut.value,
      onSelect: async () => {
        await onSignOut();
      },
    },
  ],
]);

async function onSignOut() {
  if (isSigningOut.value) {
    return;
  }

  isSigningOut.value = true;

  const { error } = await supabase.auth.signOut();

  if (error) {
    toast.add({
      title: 'No se pudo cerrar la sesión',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert',
    });
    isSigningOut.value = false;
    return;
  }

  isSigningOut.value = false;
  await navigateTo('/login', { replace: true });
}
</script>

<template>
  <div class="flex h-dvh flex-1 overflow-hidden bg-default">
    <USidebar
      v-model:open="open"
      collapsible="icon"
      rail
      :ui="{
        container: 'h-full',
        inner: 'bg-elevated/35 divide-transparent ring-0',
        header: 'border-b border-default/70',
        body: 'py-2',
        footer: 'border-t border-default/70',
      }"
    >
      <template #header="{ state }">
        <UDropdownMenu
          :items="workspaceItems"
          :content="{ align: 'start', collisionPadding: 12 }"
          :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width) min-w-56' }"
        >
          <UButton
            :icon="workspace.icon"
            :label="state === 'expanded' ? workspace.label : undefined"
            :trailing-icon="
              state === 'expanded' ? 'i-lucide-chevrons-up-down' : undefined
            "
            color="neutral"
            variant="ghost"
            :square="state === 'collapsed'"
            class="w-full overflow-hidden data-[state=open]:bg-elevated"
            :ui="{ trailingIcon: 'text-dimmed ms-auto' }"
          />
        </UDropdownMenu>
      </template>

      <template #default="{ state }">
        <div class="flex min-h-0 flex-1 flex-col gap-2">
          <UNavigationMenu
            :key="`main-${state}`"
            :items="getMainItems(state)"
            orientation="vertical"
            :ui="{ link: 'p-1.5 overflow-hidden' }"
          />

          <UNavigationMenu
            :key="`support-${state}`"
            :items="supportItems"
            orientation="vertical"
            class="mt-auto"
            :ui="{ link: 'p-1.5 overflow-hidden' }"
          />
        </div>
      </template>

      <template #footer="{ state }">
        <UDropdownMenu
          :items="userMenuItems"
          :content="{ align: 'center', collisionPadding: 12 }"
          :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width) min-w-56' }"
        >
          <UButton
            :avatar="{ icon: 'i-lucide-user', alt: user?.email ?? 'Admin' }"
            :label="
              state === 'expanded' ? (user?.email ?? 'Sin sesión') : undefined
            "
            :trailing-icon="
              state === 'expanded' ? 'i-lucide-chevrons-up-down' : undefined
            "
            color="neutral"
            variant="ghost"
            :square="state === 'collapsed'"
            class="w-full overflow-hidden data-[state=open]:bg-elevated"
            :loading="isSigningOut"
            :ui="{ trailingIcon: 'text-dimmed ms-auto' }"
          />
        </UDropdownMenu>
      </template>
    </USidebar>

    <div class="flex min-w-0 flex-1 flex-col">
      <div
        class="flex h-(--ui-header-height) shrink-0 items-center justify-between gap-3 border-b border-default px-4 sm:px-6"
      >
        <div class="flex min-w-0 items-center gap-3">
          <UButton
            icon="i-lucide-panel-left"
            color="neutral"
            variant="ghost"
            aria-label="Toggle sidebar"
            @click="open = !open"
          />

          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-highlighted">
              {{ workspace.label }}
            </p>
            <p class="truncate text-xs text-muted">
              {{ route.path }}
            </p>
          </div>
        </div>
      </div>

      <div
        class="admin-scrollbar min-h-0 flex-1 overflow-y-auto py-6 sm:py-8 [scrollbar-gutter:stable]"
      >
        <div
          class="mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 sm:px-6"
        >
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
