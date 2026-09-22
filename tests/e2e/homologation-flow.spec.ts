import { expect, test } from '@playwright/test'

test('@homolog cadastro, paciente, sessão e proteção de desativação', async ({ page }) => {
  test.skip(process.env.E2E_HOMOLOG !== '1', 'Execute com E2E_HOMOLOG=1 e a API de homologação ativa')

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const professional = `Profissional E2E ${suffix}`
  const patient = `Paciente E2E ${suffix}`

  await page.goto('/')
  await page.getByRole('button', { name: 'Criar minha conta profissional' }).click()
  await page.getByLabel('Nome completo').fill(professional)
  await page.getByLabel('Telefone').fill('(11)99999-9999')
  await page.getByLabel('E-mail').fill(`e2e-${suffix}@example.com`)
  await page.getByLabel('Senha').fill('TesteE2e123')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible()

  await page.getByRole('button', { name: 'Pacientes' }).click()
  await page.getByRole('button', { name: '+ Novo paciente' }).click()
  await page.getByLabel('Nome', { exact: true }).fill(patient)
  await page.getByLabel('Telefone').fill('(11)98888-7777')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText(patient, { exact: true })).toBeVisible()

  await page.getByText(patient, { exact: true }).click()
  await page.getByRole('button', { name: '+ Nova sessão' }).click()
  await expect(page.getByRole('heading', { name: 'Nova sessão' })).toBeVisible()
  await page.getByLabel('Modalidade').selectOption('ONLINE')
  await page.getByRole('button', { name: 'Salvar sessão' }).click()
  await expect(page.getByRole('heading', { name: 'Sessões' })).toBeVisible()

  await page.getByRole('button', { name: 'Pacientes' }).click()
  await page.getByText(patient, { exact: true }).click()
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Desativar', exact: true }).click()
  await expect(page.getByText('Cancele ou reagende as sessões futuras antes de desativar o paciente')).toBeVisible()
})
