import { boneyardPlugin } from 'boneyard-js/vite';

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@netlify/nuxt', '@vueuse/nuxt', '@nuxtjs/supabase'],
  devtools: {
    enabled: true,
  },

  css: ['~/assets/css/main.css'],

  ui: {
    fonts: false,
  },

  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || '',
    },
  },

  routeRules: {
    '/api/**': {
      cors: true,
    },
  },

  compatibilityDate: '2024-07-11',

  vite: {
    plugins: [
      boneyardPlugin({
        out: './app/bones',
        breakpoints: [375, 768, 1280],
        wait: 900,
        framework: 'vue',
        routes: ['/login', '/menu-publico', '/__bones'],
      }),
    ],
    optimizeDeps: {
      include: ['date-fns', 'date-fns/locale', 'boneyard-js', 'zod', 'gsap'],
    },
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs',
      },
    },
  },

  supabase: {
    redirect: true,
    useSsrCookies: true,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      include: [
        '/configuracion',
        '/menu(/*)?',
        '/platillos(/*)?',
        '/planes(/*)?',
      ],
      exclude: ['/login', '/menu-publico'],
      saveRedirectToCookie: true,
    },
  },
});
