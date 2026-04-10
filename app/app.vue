<script setup lang="ts">
const colorMode = useColorMode()
const config = useRuntimeConfig()

const color = computed(() => colorMode.value === 'dark' ? '#1b1718' : 'white')

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'es'
  }
})

const title = 'Heltifud Dashboard'
const description = 'Panel administrativo de Heltifud para gestionar menús semanales, catálogo de platillos y autenticación con Supabase.'
const ogImage = config.public.siteUrl
  ? `${config.public.siteUrl.replace(/\/$/, '')}/og-heltifud.png`
  : 'https://ui.nuxt.com/assets/templates/nuxt/dashboard-light.png'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage,
  twitterImage: ogImage,
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <div data-route-transition-root class="min-h-full">
        <NuxtPage :transition="false" :page-key="route => route.fullPath" />
      </div>
    </NuxtLayout>
  </UApp>
</template>
