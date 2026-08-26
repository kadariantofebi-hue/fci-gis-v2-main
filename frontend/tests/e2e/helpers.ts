import { expect, type Page } from '@playwright/test';

export async function loginAs(page: Page, email = 'admin@simanta.test') {
  await page.goto('/login');
  await page.getByPlaceholder('email').fill(email);
  await page.getByPlaceholder('password').fill('password');
  await page.getByRole('button', { name: 'Lanjut OTP' }).click();
  await page.getByPlaceholder('Kode OTP').fill('123456');

  const submit = page.getByRole('button', { name: 'Masuk Dashboard' });
  await expect(submit).toBeEnabled();
  await Promise.all([page.waitForURL('**/dashboard'), submit.click({ force: true })]);
  await expect(page.getByRole('heading', { name: 'Dashboard Proyek GIS' })).toBeVisible();
}

export async function switchRole(page: Page, role: string) {
  await page.getByLabel(/Pilih Role|Role/i).selectOption(role);
}
