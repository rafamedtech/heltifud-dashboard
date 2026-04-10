<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['supabase-auth']
})

useSeoMeta({
  title: 'Gestión de planes | Heltifud Meal Preps',
  description: 'Administra la configuración de planes dentro del panel administrativo de Heltifud Meal Preps.',
  robots: 'noindex, nofollow'
})
</script>

<template>
  <main>Admin planes</main>
</template>
