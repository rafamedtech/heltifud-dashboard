import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.PORT || 3101)
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`

const defaultEnv = {
  NETLIFY_DEV: process.env.NETLIFY_DEV || '1',
  NITRO_HOST: process.env.NITRO_HOST || '127.0.0.1',
  NITRO_PORT: process.env.NITRO_PORT || String(port),
  NUXT_DEVTOOLS: process.env.NUXT_DEVTOOLS || 'false',
  PORT: String(port),
  NUXT_PUBLIC_SITE_URL: process.env.NUXT_PUBLIC_SITE_URL || baseURL,
  NUXT_PUBLIC_SUPABASE_URL: process.env.NUXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
  NUXT_PUBLIC_SUPABASE_KEY: process.env.NUXT_PUBLIC_SUPABASE_KEY || 'test-anon-key',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://playwright:playwright@127.0.0.1:5432/heltifud'
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results/playwright',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    colorScheme: 'light',
    locale: 'es-MX'
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1024 }
      }
    }
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'pnpm run test:e2e:serve',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180 * 1000,
        env: defaultEnv
      }
})
