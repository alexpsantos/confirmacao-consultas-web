import { expect, test } from '@playwright/test'

test('login não aplica regra de senha de cadastro', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible()
  await expect(page.getByLabel('Senha')).not.toHaveAttribute('pattern')
  await expect(page.getByLabel('Senha')).not.toHaveAttribute('minlength')
})

test('cadastro pede fuso horário e informa a regra de senha', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Criar minha conta profissional' }).click()

  await expect(page.getByRole('heading', { name: 'Criar minha conta profissional' })).toBeVisible()
  await expect(page.getByLabel('Fuso horário')).toBeVisible()
  await expect(page.getByLabel('Senha')).toHaveAttribute('pattern')
  await expect(page.getByLabel('Senha')).toHaveAttribute('minlength', '8')
})
