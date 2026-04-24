<script setup lang="ts">
const route = useRoute();
const colorMode = useColorMode()

const links = [
  { label: 'Inicio', to: '/menu-publico', icon: 'i-lucide-house' },
  { label: 'Planes', to: '/menu-publico', icon: 'i-lucide-newspaper' },
  { label: 'Menú', to: '/menu-publico', icon: 'i-lucide-notebook-tabs' }
];

function toggleColorMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <header class="border-b border-primary/10 bg-primary/5 backdrop-blur">
    <div class="mx-auto grid min-h-20 w-full max-w-7xl grid-cols-[1fr_auto] items-center gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-8">
      <NuxtLink
        to="/menu-publico"
        class="flex w-fit items-center gap-3"
      >
        <span class="flex size-12 items-center justify-center rounded-lg border border-primary/35 bg-default text-primary shadow-sm shadow-black/5">
          <UIcon
            name="i-lucide-utensils-crossed"
            class="size-7"
          />
        </span>

        <div class="min-w-0">
          <p class="truncate text-lg font-semibold tracking-normal text-highlighted">
            Heltifud
          </p>
          <p class="truncate text-[10px] uppercase tracking-[0.24em] text-muted">
            Meal Preps
          </p>
        </div>
      </NuxtLink>

      <nav class="hidden items-center gap-6 md:flex">
        <UButton
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :icon="link.icon"
          :variant="route.path === link.to && link.label === 'Menú' ? 'link' : 'link'"
          :color="route.path === link.to && link.label === 'Menú' ? 'primary' : 'neutral'"
          class="px-0 text-sm"
        >
          {{ link.label }}
        </UButton>
      </nav>

      <div class="flex items-center justify-end gap-2">
        <UButton
          color="neutral"
          variant="soft"
          square
          :icon="colorMode.value === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'"
          aria-label="Cambiar tema"
          class="size-11 rounded-xl"
          @click="toggleColorMode"
        />

        <UButton
          to="/login"
          icon="i-lucide-rocket"
          aria-label="Ordenar"
          class="size-11 rounded-xl sm:hidden"
        />

        <UButton
          to="/login"
          icon="i-lucide-rocket"
          size="lg"
          class="hidden rounded-xl px-5 font-semibold sm:inline-flex"
        >
          Ordenar
        </UButton>
      </div>
    </div>
  </header>
</template>
