import { expect, test } from '@playwright/test'

test('renderiza la pantalla de login', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByRole('textbox', { name: /correo electrónico/i })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /contraseña/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible()

  await expect(page.locator('.login-page')).toHaveScreenshot('login-page.png', {
    animations: 'disabled',
    caret: 'hide'
  })
})
