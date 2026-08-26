import { expect, type Page } from '@playwright/test';

export async function loginAs(page: Page, email = 'admin@simanta.test') {
  await page.goto('/login');
  await page.getByPlaceholder('email').fill(email);
  await page.getByPlaceholder('password').fill('password');
  await page.getByRole('button', { name: 'Lanjut OTP' }).click();
  await page.getByPlaceholder('Kode OTP').fill('123456');
  await page.getByRole('button', { name: 'Masuk Dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard WebGIS' })).toBeVisible();
}
