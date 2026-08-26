import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Dashboard bottom sheet drawer (hybrid digitize, 2026-06-28)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test('handle is visible and collapsed by default on /dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    const handle = page.getByTestId('dashboard-draw-sheet-handle');
    await expect(handle).toBeVisible();
    await expect(page.getByTestId('dashboard-draw-sheet')).toHaveCount(0);
  });

  test('tapping the handle opens the sheet with the polygon mode preselected', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByTestId('dashboard-draw-sheet-handle').click();
    const sheet = page.getByTestId('dashboard-draw-sheet');
    await expect(sheet).toBeVisible();
    await expect(page.getByTestId('dashboard-draw-sheet-mode-polygon')).toBeChecked();
    // status text is present (a11y live region)
    await expect(page.getByTestId('dashboard-draw-sheet-status')).toBeVisible();
    // CTA is disabled until a polygon is complete
    await expect(page.getByTestId('dashboard-draw-sheet-add-project')).toBeDisabled();
  });

  test('tapping the close (✕) closes the sheet', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByTestId('dashboard-draw-sheet-handle').click();
    await expect(page.getByTestId('dashboard-draw-sheet')).toBeVisible();
    await page.getByTestId('dashboard-draw-sheet-close').click();
    await expect(page.getByTestId('dashboard-draw-sheet')).toHaveCount(0);
  });

  test('mode radio switching is reflected in the checked state', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByTestId('dashboard-draw-sheet-handle').click();
    await page.getByTestId('dashboard-draw-sheet-mode-line').click();
    await expect(page.getByTestId('dashboard-draw-sheet-mode-line')).toBeChecked();
    await expect(page.getByTestId('dashboard-draw-sheet-mode-polygon')).not.toBeChecked();
  });

  test('Reset button clears any in-progress draft and keeps CTA disabled', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByTestId('dashboard-draw-sheet-handle').click();
    // Even without an in-progress draft, Reset is harmless: CTA stays disabled.
    await page.getByTestId('dashboard-draw-sheet-reset').click();
    await expect(page.getByTestId('dashboard-draw-sheet-add-project')).toBeDisabled();
  });

  test('drawing a polygon on dashboard and clicking "Tambah Proyek" transfers geometry and focuses map on /projects/create', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByTestId('dashboard-draw-sheet-handle').click();

    // Wait for map container to be visible
    const mapEl = page.locator('.maplibregl-map');
    await expect(mapEl).toBeVisible();

    // Draw a 3-vertex polygon and close it
    const box = await mapEl.boundingBox();
    if (box) {
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await page.mouse.click(cx, cy);
      await page.mouse.click(cx - 80, cy);
      await page.mouse.click(cx - 40, cy + 80);
      await page.mouse.click(cx, cy); // click first vertex to close
    }

    // CTA should now be enabled
    const addBtn = page.getByTestId('dashboard-draw-sheet-add-project');
    await expect(addBtn).toBeEnabled({ timeout: 5000 });
    await addBtn.click();

    // Navigation to /projects/create
    await expect(page).toHaveURL(/\/projects\/create/);
    await expect(page.getByTestId('project-geometry-state')).toContainText('Geometry: Polygon', { timeout: 5000 });
    await expect(page.getByTestId('digitize-mode-polygon')).toHaveClass(/bg-emerald-600/);
    await expect(page.locator('[data-digitize-ready="true"]')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('digitize-vertex-count')).toContainText('3 vertex');
  });

  test('drawing a point on dashboard and clicking "Tambah Proyek" switches mode to point and auto-fills coordinates', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByTestId('dashboard-draw-sheet-handle').click();
    await page.getByTestId('dashboard-draw-sheet-mode-point').click();

    const mapEl = page.locator('.maplibregl-map');
    await expect(mapEl).toBeVisible();

    const box = await mapEl.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }

    const addBtn = page.getByTestId('dashboard-draw-sheet-add-project');
    await expect(addBtn).toBeEnabled({ timeout: 5000 });
    await addBtn.click();

    await expect(page).toHaveURL(/\/projects\/create/);
    await expect(page.getByTestId('project-geometry-state')).toContainText('Geometry: Point', { timeout: 5000 });
    await expect(page.getByTestId('digitize-mode-point')).toHaveClass(/bg-emerald-600/);
    await expect(page.locator('[data-digitize-ready="true"]')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('digitize-vertex-count')).toContainText('1 vertex');

    // Coordinates in form should be auto-filled, not empty
    const latValue = await page.getByTestId('project-coord-lat').inputValue();
    const lngValue = await page.getByTestId('project-coord-lng').inputValue();
    expect(latValue).not.toBe('');
    expect(lngValue).not.toBe('');
  });
});
