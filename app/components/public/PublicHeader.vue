<script setup lang="ts">
const route = useRoute();

const links = [
  { label: 'Menú semanal', to: '/menu-publico' },
  { label: 'Admin', to: '/login' }
];
</script>

<template>
  <header class="border-b border-default/70 bg-default/95 backdrop-blur">
    <div class="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
      <NuxtLink to="/menu-publico" class="flex items-center gap-3">
        <span class="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <UIcon name="i-lucide-utensils-crossed" class="size-5" />
        </span>

        <div class="min-w-0">
          <p class="truncate text-sm font-semibold uppercase tracking-[0.24em] text-primary">Heltifud</p>
          <p class="truncate text-sm text-muted">Meal Preps semanales</p>
        </div>
      </NuxtLink>

      <nav class="flex items-center gap-2">
        <UButton
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :variant="route.path === link.to ? 'soft' : 'ghost'"
          color="neutral"
        >
          {{ link.label }}
        </UButton>
      </nav>
    </div>
  </header>
</template>
