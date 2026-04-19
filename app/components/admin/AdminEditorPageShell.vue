<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  description?: string
  contentClass?: string
}>(), {
  description: '',
  contentClass: 'mx-auto w-full max-w-6xl'
})
</script>

<template>
  <main class="space-y-6">
    <section>
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="max-w-2xl space-y-2">
          <h1 class="text-3xl font-semibold tracking-tight text-primary">
            {{ title }}
          </h1>

          <p v-if="description" class="text-sm leading-6 text-muted">
            {{ description }}
          </p>
        </div>

        <div v-if="$slots.actions" class="flex items-center gap-3 md:justify-end">
          <slot name="actions" />
        </div>
      </div>
    </section>

    <section :class="contentClass">
      <slot />
    </section>
  </main>
</template>
