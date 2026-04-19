import { expect, test } from '@playwright/test'

test('renderiza fixtures públicos para validación visual', async ({ page }) => {
  await page.goto('/__bones')

  await expect(page.getByRole('heading', { name: 'Capture Fixtures' })).toBeVisible()
  await expect(page.getByTestId('bones-menu-edit')).toBeVisible()
  await expect(page.getByTestId('bones-food-edit')).toBeVisible()

  await expect(page.getByTestId('bones-root')).toHaveScreenshot('bones-fixtures.png', {
    animations: 'disabled',
    caret: 'hide'
  })
})
