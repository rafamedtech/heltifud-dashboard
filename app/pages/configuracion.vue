<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['supabase-auth']
})

useSeoMeta({
  title: 'Configuración | Heltifud Meal Preps',
  description: 'Atajos de configuración general y seguridad para el panel de Heltifud.',
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
        Accesos rápidos a las secciones de configuración existentes del dashboard base mientras terminamos de consolidarlas dentro del área admin.
      </p>
    </section>

    <section class="grid gap-4 md:grid-cols-3">
      <UCard class="app-surface" :ui="{ body: 'space-y-4 p-6' }">
        <h2 class="text-lg font-semibold text-highlighted">
          General
        </h2>
        <p class="text-sm text-muted">
          Información del perfil, datos básicos y preferencias generales.
        </p>
        <UButton
          to="/settings"
          color="neutral"
          variant="outline"
          icon="i-lucide-arrow-right"
        >
          Abrir
        </UButton>
      </UCard>

      <UCard class="app-surface" :ui="{ body: 'space-y-4 p-6' }">
        <h2 class="text-lg font-semibold text-highlighted">
          Notificaciones
        </h2>
        <p class="text-sm text-muted">
          Canales de avisos y comportamiento del sistema para el equipo.
        </p>
        <UButton
          to="/settings/notifications"
          color="neutral"
          variant="outline"
          icon="i-lucide-arrow-right"
        >
          Abrir
        </UButton>
      </UCard>

      <UCard class="app-surface" :ui="{ body: 'space-y-4 p-6' }">
        <h2 class="text-lg font-semibold text-highlighted">
          Seguridad
        </h2>
        <p class="text-sm text-muted">
          Credenciales, sesión y políticas básicas del acceso administrativo.
        </p>
        <UButton
          to="/settings/security"
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
