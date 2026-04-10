<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const schema = z.object({
  email: z.email('Ingresa un correo electrónico válido.'),
  password: z.string('La contraseña es obligatoria.').min(8, 'La contraseña debe tener al menos 8 caracteres.')
})

type Schema = z.output<typeof schema>

const supabase = useSupabaseClient()
const toast = useToast()
const route = useRoute()
const currentSession = useSupabaseSession()
const redirectInfo = useSupabaseCookieRedirect()
const state = reactive<Partial<Schema>>({
  email: '',
  password: ''
})
const isSubmitting = ref(false)
const authError = ref('')

async function onSubmit(event: FormSubmitEvent<Schema>) {
  authError.value = ''
  isSubmitting.value = true

  const { data, error } = await supabase.auth.signInWithPassword({
    email: event.data.email,
    password: event.data.password
  })

  isSubmitting.value = false

  if (error) {
    authError.value = error.message || 'No fue posible iniciar sesión.'
    toast.add({
      title: 'Error al iniciar sesión',
      description: authError.value,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  toast.add({
    title: 'Sesión iniciada',
    description: 'Redirigiendo al panel administrativo.',
    color: 'success',
    icon: 'i-lucide-check-circle'
  })

  currentSession.value = data.session ?? null

  const redirectTo
    = redirectInfo.pluck()
      || (typeof route.query.redirect === 'string' ? route.query.redirect : '/')

  await nextTick()
  await navigateTo(redirectTo, { replace: true })
}

definePageMeta({
  layout: false,
  middleware: ['supabase-guest']
})

useSeoMeta({
  title: 'Iniciar sesión | Heltifud Meal Preps',
  description: 'Accede al panel administrativo de Heltifud Meal Preps.',
  robots: 'noindex, nofollow'
})
</script>

<template>
  <section class="login-page bg-green-50/50 text-highlighted dark:bg-neutral-950">
    <PublicHeader />

    <PublicSeparator />

    <main
      class="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-8 md:px-6 bg-[linear-gradient(180deg,rgb(248_249_245)_0%,rgb(241_244_239)_100%)] dark:bg-[linear-gradient(180deg,rgb(8_10_14)_0%,rgb(5_7_11)_100%)]"
    >
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0"
      >
        <div class="login-glow login-glow-left" />
        <div class="login-glow login-glow-right" />
        <div class="login-grid" />
      </div>

      <section class="relative z-10 w-full max-w-md">
        <UCard
          class="overflow-hidden shadow-2xl shadow-black/8 dark:shadow-black/45"
          :ui="{
            root: 'rounded-2xl border border-default/70 bg-default/92 backdrop-blur-sm dark:border-white/8 dark:bg-neutral-900/90',
            body: 'p-0 sm:p-0'
          }"
        >
          <div class="space-y-6 px-6 py-6 sm:px-7 sm:py-7">
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <div
                  class="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:bg-primary/12 dark:ring-primary/15"
                >
                  <UIcon
                    name="i-lucide-lock-keyhole"
                    class="size-5"
                  />
                </div>
                <div>
                  <p class="text-lg font-semibold text-highlighted">
                    Iniciar sesión
                  </p>
                  <p class="text-sm text-muted">
                    Accede para entrar a la sección admin.
                  </p>
                </div>
              </div>
            </div>

            <UAlert
              v-if="authError"
              color="error"
              variant="soft"
              icon="i-lucide-circle-alert"
              :title="authError"
            />

            <UForm
              :schema="schema"
              :state="state"
              class="space-y-5"
              @submit="onSubmit"
            >
              <UFormField
                name="email"
                label="Correo electrónico"
                class="space-y-2"
                :ui="{ label: 'text-sm font-medium text-highlighted' }"
              >
                <UInput
                  v-model="state.email"
                  type="email"
                  size="xl"
                  autofocus
                  autocomplete="email"
                  icon="i-lucide-mail"
                  placeholder="tu@correo.com"
                  class="w-full"
                  :ui="{
                    base: 'h-12',
                    leadingIcon: 'size-5 text-muted'
                  }"
                />
              </UFormField>

              <UFormField
                name="password"
                class="space-y-2"
                :ui="{ label: 'text-sm font-medium text-highlighted' }"
              >
                <label
                  for="login-password"
                  class="text-sm font-medium text-highlighted"
                >
                  Contraseña
                </label>

                <UInput
                  id="login-password"
                  v-model="state.password"
                  type="password"
                  size="xl"
                  autocomplete="current-password"
                  icon="i-lucide-key-round"
                  placeholder="Ingresa tu contraseña"
                  class="w-full"
                  :ui="{
                    base: 'h-12',
                    leadingIcon: 'size-5 text-muted'
                  }"
                />
              </UFormField>

              <UButton
                type="submit"
                block
                size="xl"
                color="primary"
                class="justify-center"
                :loading="isSubmitting"
                :disabled="isSubmitting"
              >
                Entrar
              </UButton>
            </UForm>
          </div>
        </UCard>
      </section>
    </main>

    <PublicSeparator />

    <PublicFooter />
  </section>
</template>

<style scoped>
.login-page {
  display: flex;
  min-height: 100dvh;
  flex-direction: column;
}

.login-glow {
  position: absolute;
  inset: auto;
  border-radius: 9999px;
  filter: blur(80px);
  opacity: 0.8;
}

.login-glow-left {
  top: 8%;
  left: -8%;
  width: 22rem;
  height: 22rem;
  background: radial-gradient(circle, rgb(34 197 94 / 0.12) 0%, rgb(34 197 94 / 0) 70%);
}

.login-glow-right {
  right: -10%;
  bottom: 6%;
  width: 24rem;
  height: 24rem;
  background: radial-gradient(circle, rgb(16 185 129 / 0.1) 0%, rgb(16 185 129 / 0) 72%);
}

.login-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgb(15 23 42 / 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgb(15 23 42 / 0.025) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(circle at center, black 35%, transparent 90%);
}

:global(.dark) .login-glow-left {
  background: radial-gradient(circle, rgb(16 185 129 / 0.12) 0%, rgb(16 185 129 / 0) 72%);
}

:global(.dark) .login-glow-right {
  background: radial-gradient(circle, rgb(34 197 94 / 0.1) 0%, rgb(34 197 94 / 0) 74%);
}

:global(.dark) .login-grid {
  background-image:
    linear-gradient(rgb(148 163 184 / 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgb(148 163 184 / 0.025) 1px, transparent 1px);
}

@media (max-width: 640px) {
  .login-glow-left,
  .login-glow-right {
    width: 16rem;
    height: 16rem;
    filter: blur(64px);
  }
}
</style>
