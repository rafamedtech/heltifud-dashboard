<script setup lang="ts">
import type { AdminOrderFormData } from '~~/types/types'

definePageMeta({
  layout: 'admin',
  middleware: ['supabase-auth']
})

const {
  data: formData,
  error,
  status
} = await useLazyFetch<AdminOrderFormData>('/api/admin/orders/form', {
  default: () => ({
    users: [],
    plans: [],
    menus: []
  })
})

const isLoading = computed(() =>
  status.value === 'idle' || status.value === 'pending'
)

useSeoMeta({
  title: 'Gestión de pedidos | Crear nuevo pedido | Heltifud Meal Preps',
  description: 'Crea un nuevo pedido dentro del panel administrativo de Heltifud Meal Preps.',
  robots: 'noindex, nofollow'
})
</script>

<template>
  <AdminOrderEditorPage
    :form-data="formData"
    :is-loading="isLoading"
    :load-error="error"
  />
</template>
