import { expect, test } from '@playwright/test'

test('redirige a login cuando entras al admin sin sesión', async ({ page }) => {
  await page.goto('/menu')

  await expect(page).toHaveURL(/\/login(?:\?.*)?$/)
  await expect(page.getByRole('textbox', { name: /correo electrónico/i })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /contraseña/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible()
})
