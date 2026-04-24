<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['supabase-auth']
})

useSeoMeta({
  title: 'Configuración | Heltifud Meal Preps',
  description: 'Atajos de configuración operativa para el panel de Heltifud.',
  robots: 'noindex, nofollow'
})
</script>

<template>
  <main class="space-y-6">
    <section class="space-y-2">
      <h1 class="text-3xl font-semibold tracking-tight text-primary">
        Configuración
      </h1>
      <p class="max-w-3xl text-sm text-muted">
        Accesos rápidos para administrar insumos, categorías y usuarios del panel.
      </p>
    </section>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <UCard class="app-surface" :ui="{ body: 'space-y-4 p-6' }">
        <h2 class="text-lg font-semibold text-highlighted">
          Insumos
        </h2>
        <p class="text-sm text-muted">
          CRUD dedicado del catálogo de insumos reutilizables para recetas y compras.
        </p>
        <UButton
          to="/configuracion/insumos"
          color="neutral"
          variant="outline"
          icon="i-lucide-arrow-right"
        >
          Abrir
        </UButton>
      </UCard>

      <UCard class="app-surface" :ui="{ body: 'space-y-4 p-6' }">
        <h2 class="text-lg font-semibold text-highlighted">
          Categorías de insumos
        </h2>
        <p class="text-sm text-muted">
          CRUD dedicado para organizar insumos por familias operativas.
        </p>
        <UButton
          to="/configuracion/categorias-insumos"
          color="neutral"
          variant="outline"
          icon="i-lucide-arrow-right"
        >
          Abrir
        </UButton>
      </UCard>

      <UCard class="app-surface" :ui="{ body: 'space-y-4 p-6' }">
        <h2 class="text-lg font-semibold text-highlighted">
          Usuarios
        </h2>
        <p class="text-sm text-muted">
          Gestión de clientes y administradores con permisos del sistema.
        </p>
        <UButton
          to="/usuarios"
          color="neutral"
          variant="outline"
          icon="i-lucide-arrow-right"
        >
          Abrir
        </UButton>
      </UCard>
    </section>
  </main>
</template>
