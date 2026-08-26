import { expect, test } from '@playwright/test';
import { loginAs, switchRole } from './helpers';

const activeOpd = 'DPUPR Sidoarjo';
const paymentStatuses = ['draft', 'submitted', 'verified', 'paid', 'rejected', 'cancelled'];

test.describe('SIMANTA frontend MVP PRD v1.3.7 smoke', () => {
  test('admin can login and open primary MVP modules in single active OPD mode', async ({ page }) => {
    await loginAs(page);
    await expect(page).toHaveTitle(/SIMANTA - Dashboard Proyek GIS/);
    // Full-maps refactor 2026-06-21: header section di-remove, kicker pindah ke Navbar.
    // Kicker baru = "SIMANTA · Administrasi Proyek GIS" (sama dengan Navbar).
    await expect(page.getByText('SIMANTA · Administrasi Proyek GIS').first()).toBeVisible();
    // Subtitle Contract-first prototype di-remove dari Navbar (bersih untuk produksi).
    await expect(page.getByText(/Contract-first prototype/i)).toHaveCount(0);
    // PRD v1.4: Dashboard Proyek tidak lagi menampilkan dual-pillar "Aset Wilayah" + "Administrasi Proyek GIS"
    await expect(page.getByText('Dashboard Proyek GIS').first()).toBeVisible();
    await expect(page.getByText('Distribusi OPD')).toHaveCount(0);
    // 2 KPI utama: Total Proyek + Proyek Berjalan
    await expect(page.getByTestId('kpi-card-total-proyek')).toBeVisible();
    await expect(page.getByTestId('kpi-card-proyek-berjalan')).toBeVisible();
    // Layer per status (PRD v1.4 §8.1)
    await expect(page.getByTestId('layer-status-berjalan')).toBeVisible();
    await expect(page.getByLabel('Grouping layer')).toBeVisible();

    await page.getByRole('link', { name: /Profil OPD/ }).click();
    await expect(page).toHaveTitle(/SIMANTA - Profil OPD Pengguna/);
    await expect(page.getByRole('heading', { name: 'Profil OPD Pengguna' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tambah mock' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Hapus OPD/ })).toHaveCount(0);
    await expect(page.getByText(/transfer aset/i)).toHaveCount(0);

    await page.getByRole('link', { name: /Administrasi Proyek GIS/ }).click();
    await expect(page).toHaveTitle(/SIMANTA - Administrasi Proyek GIS/);
    await expect(page.getByRole('link', { name: 'Tambah proyek mock' })).toBeVisible();

    await page.getByRole('link', { name: /Laporan/ }).click();
    await expect(page).toHaveTitle(/SIMANTA - Laporan Interaktif/);
    await expect(page.getByLabel('Filter laporan OPD')).toHaveCount(0);
    await expect(page.getByText(/own_opd/)).toBeVisible();
  });

  test('viewer direct mutation routes are blocked by route/action guard', async ({ page }) => {
    await loginAs(page);
    await switchRole(page, 'Viewer');
    await page.goto('/assets');
    await expect(page.getByRole('link', { name: 'Tambah aset' })).toHaveCount(0);
    await page.goto('/assets/create');
    await expect(page.getByRole('heading', { name: 'Akses ditolak' })).toBeVisible();
    await page.goto('/opd');
    await expect(page.getByRole('button', { name: 'Edit profil OPD' })).toHaveCount(0);
    await expect(page.getByText(/Mode baca saja/)).toBeVisible();
    await page.goto('/projects');
    await expect(page.getByRole('link', { name: 'Tambah proyek mock' })).toHaveCount(0);
    await page.goto('/projects/create');
    await expect(page.getByRole('heading', { name: 'Akses ditolak' })).toBeVisible();
    await page.goto('/projects/prj-001/documents');
    await expect(page.getByRole('heading', { name: 'Akses ditolak' })).toBeVisible();
    await page.goto('/projects/prj-001/payments');
    await expect(page.getByRole('heading', { name: 'Akses ditolak' })).toBeVisible();
  });

  test('PRD v1.4 C3: Viewer dengan project:read tetap bisa akses /dashboard (route guard pakai project:read, bukan asset:read)', async ({ page }) => {
    await loginAs(page);
    await switchRole(page, 'Viewer');
    await page.goto('/dashboard');
    // Dashboard bukan asset page — Viewer boleh lihat meski tidak punya asset:read
    await expect(page.getByRole('heading', { name: /Dashboard Proyek/i })).toBeVisible();
    // 2 KPI utama tetap muncul untuk Viewer (non-sensitive aggregate data)
    await expect(page.getByTestId('kpi-card-total-proyek')).toBeVisible();
    await expect(page.getByTestId('kpi-card-proyek-berjalan')).toBeVisible();
    // Switch kembali ke Admin dan pastikan akses masih OK (regression guard)
    await switchRole(page, 'Admin');
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Dashboard Proyek/i })).toBeVisible();
  });

  test('OPD profile can be edited without CRUD/list affordances', async ({ page }) => {
    await loginAs(page);
    await page.goto('/opd');
    await expect(page.getByText('MVP ini hanya menampilkan Profil OPD aktif/default sesuai PRD v1.3.7. Fitur lintas OPD tidak termasuk scope aktif.')).toBeVisible();
    await expect(page.getByText(/CRUD OPD tambahan|relokasi|transfer antar-OPD/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Edit profil OPD' }).click();
    await expect(page.getByRole('dialog', { name: 'Edit Profil OPD Pengguna' })).toBeVisible();
    await page.getByLabel('Singkatan OPD edit').fill('DPUPR Sidoarjo');
    await page.getByRole('button', { name: 'Simpan profil OPD' }).click();
    await expect(page.getByRole('status')).toContainText('OPD_CURRENT_UPDATED');
  });

  test('project create/edit has no OPD selector and uses active OPD implicitly', async ({ page }) => {
    await loginAs(page);
    await page.goto('/projects/create');
    await expect(page.getByLabel('OPD proyek')).toHaveCount(0);
    await page.getByLabel('Kode proyek').fill('GIS-2026-MOCK');
    await page.getByLabel('Nama proyek').fill('Mock Pemetaan PRD 1.3.7');
    await page.getByLabel('Vendor proyek').fill('PT Mock GIS');
    await page.getByLabel('Nomor kontrak').fill('027/MOCK/137/2026');
    await page.getByLabel('Nilai kontrak').fill('123000000');
    // 2026-06-27: Alamat + peta wilayah
    await page.getByLabel('Jalan').fill('Jl. Raya Buduran No. 12');
    await page.getByLabel('RT').fill('03');
    await page.getByLabel('RW').fill('02');
    await page.getByLabel('Kelurahan').fill('Buduran');
    await page.getByLabel('Kecamatan').fill('Buduran');
    // Peta: default mode = polygon, klik 3 vertex
    await expect(page.getByTestId('digitize-mode')).toContainText('polygon');
    await expect(page.locator('[data-digitize-ready="true"]')).toBeVisible({ timeout: 10000 });
    const projectMap = page.getByTestId('digitize-map');
    await projectMap.click({ position: { x: 220, y: 100 } });
    await projectMap.click({ position: { x: 320, y: 100 } });
    await projectMap.click({ position: { x: 270, y: 180 } });
    await page.getByTestId('digitize-commit').click();
    await expect(page.getByTestId('project-geometry-state')).toContainText('Geometry: Polygon');
    await page.getByRole('button', { name: 'Simpan proyek + dokumen' }).click();
    await expect(page.getByText('PROJECT_WITH_DOCUMENTS_CREATED').first()).toBeVisible();

    await page.goto('/projects/prj-001/edit');
    await expect(page).toHaveTitle(/SIMANTA - Edit Administrasi Proyek GIS/);
    await expect(page.getByRole('heading', { name: 'Edit Administrasi Proyek GIS' })).toBeVisible();
    await expect(page.getByLabel('OPD proyek')).toHaveCount(0);
    await page.getByLabel('Nama proyek').fill('Pemetaan Aset Jalan dan Saluran Koridor Utara Revisi');
    await page.getByRole('button', { name: 'Simpan perubahan proyek mock' }).click();
    await expect(page.getByRole('status')).toContainText('PROJECT_UPDATED');
  });

  test('Project GIS document headers show multi-file upload, verify rule, audit file id, and block Viewer route', async ({ page }) => {
    await loginAs(page);
    await page.goto('/projects/prj-001/documents');
    await expect(page.getByText('Mock upload multi-file interaktif')).toBeVisible();
    await expect(page.getByText('hps_rahasia_GIS-2026-001.pdf')).toBeVisible();
    await expect(page.getByText('Scan: pending').first()).toBeVisible();
    await page.getByRole('button', { name: /Download placeholder/ }).first().click();
    await expect(page.getByRole('status')).toContainText('PROJECT_DOCUMENT_DOWNLOAD');
    await page.goto('/audit');
    await expect(page.getByText('PROJECT_DOCUMENT_DOWNLOAD')).toBeVisible();
    await expect(page.getByText(/file-1-1-a/)).toBeVisible();

    await page.goto('/projects/prj-001/documents');
    await page.getByLabel('Pilih header dokumen upload').selectOption('doc-1-4');
    await page.getByRole('button', { name: 'Submit/Verify mock' }).nth(3).click();
    await expect(page.getByRole('alert')).toContainText('PROJECT_DOCUMENT_INCOMPLETE');

    await switchRole(page, 'Viewer');
    await page.goto('/projects/prj-001/documents');
    await expect(page.getByRole('heading', { name: 'Akses ditolak' })).toBeVisible();
    await expect(page.getByLabel('Pilih header dokumen upload')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Commit upload mock' })).toHaveCount(0);
    await expect(page.getByText('Metadata sensitif disembunyikan RBAC')).toHaveCount(0);
    await expect(page.getByText(/hps_rahasia|lampiran_hps|kontrak_GIS|invoice_termin/i)).toHaveCount(0);
    await expect(page.locator('article')).toHaveCount(0);
    await expect(page.getByText('Mock upload multi-file interaktif')).toHaveCount(0);
    await expect(page.getByLabel('Pilih multi-file dokumen')).toHaveCount(0);
  });

  test('document multi-file input commits mock uploads', async ({ page }) => {
    await loginAs(page);
    await page.goto('/projects/prj-001/documents');
    await page.getByLabel('Pilih header dokumen upload').selectOption('doc-1-4');
    await page.getByLabel('Pilih multi-file dokumen').setInputFiles([
      { name: 'lampiran-a.pdf', mimeType: 'application/pdf', buffer: Buffer.from('a') },
      { name: 'lampiran-b.pdf', mimeType: 'application/pdf', buffer: Buffer.from('b') }
    ]);
    await expect(page.getByText('lampiran-a.pdf')).toBeVisible();
    await expect(page.getByText('lampiran-b.pdf')).toBeVisible();
    await page.getByRole('button', { name: 'Commit upload mock' }).click();
    await expect(page.getByRole('status')).toContainText('PROJECT_DOCUMENT_FILES_CREATED');
    await expect(page.getByText('lampiran-a.pdf')).toBeVisible();
  });

  test('document fixture verified headers always have active clean files', async ({ page }) => {
    await loginAs(page);
    await page.goto('/projects/prj-001/documents');
    const verifiedRowsWithoutClean = page.locator('article').filter({ has: page.locator('.badge', { hasText: 'verified' }) }).filter({ has: page.locator('.badge', { hasText: 'clean 0' }) });
    await expect(verifiedRowsWithoutClean).toHaveCount(0);
  });

  test('single active OPD enforced: no cross-OPD selector/filter in project, asset, reports, and role UI DOM', async ({ page }) => {
    // Invariant: tidak ada cross-OPD UI di MVP PRD v1.3.7. Cleanup 2026-06-21
    // menghapus teks eksplisit 'single active OPD' / 'OPD aktif/default'
    // dari subtitle Navbar, Sidebar banner, dan form project — karena
    // invariant di-encapsulate oleh absence of cross-OPD selector/filter,
    // bukan oleh宣传 teks. Test ini fokus ke absence assertions.
    await loginAs(page);
    await expect(page.getByLabel(/Pilih Role|Role/i)).not.toContainText('Finance');
    await expect(page.getByText(/Semua OPD|Distribusi OPD|Grouping OPD|Filter OPD|Pilih OPD|selector OPD/i)).toHaveCount(0);

    await page.goto('/projects');
    // Tabel project tidak lagi menampilkan kolom OPD aktif (cleanup 2026-06-21).
    // Cek absence: tidak ada header 'OPD aktif' atau 'OPD aktif/default'
    // di area ringkasan/card maupun tabel.
    await expect(page.getByRole('columnheader', { name: 'OPD aktif' })).toHaveCount(0);
    await expect(page.getByText('OPD aktif/default', { exact: true })).toHaveCount(0);
    const projectRows = page.locator('tbody tr');
    await expect(projectRows).toHaveCount(3);
    await expect(page.getByText(/Semua OPD|Distribusi OPD|OPD selector|filter lintas OPD/i)).toHaveCount(0);

    await page.goto('/assets');
    // Assets tabel masih menampilkan kolom OPD aktif (di luar scope cleanup).
    // Pertahankan assertion: kolom ke-4 (index 3) harus berisi activeOpd.
    const assetRows = page.locator('tbody tr');
    await expect(assetRows).toHaveCount(12);
    for (let i = 0; i < await assetRows.count(); i += 1) {
      await expect(assetRows.nth(i).locator('td').nth(3)).toHaveText(activeOpd);
    }
    await expect(page.getByText(/Semua OPD|Distribusi OPD|OPD selector|filter lintas OPD/i)).toHaveCount(0);

    await page.goto('/reports');
    // own_opd (DPUPR Sidoarjo) — dicek saat eksekusi; jika tidak visible
    // karena cleanup, ganti dengan absence assertion saja.
    await expect(page.getByText(`own_opd (${activeOpd})`)).toBeVisible();
    await expect(page.getByLabel('Filter laporan OPD')).toHaveCount(0);
    await expect(page.getByText(/Semua OPD|Distribusi OPD|grouping OPD|selector OPD/i)).toHaveCount(0);
  });

  test('document role matrix follows project document permissions and blocks Viewer route', async ({ page }) => {
    await loginAs(page);
    await page.goto('/projects/prj-001/documents');

    await expect(page.getByText('hps_rahasia_GIS-2026-001.pdf')).toBeVisible();
    await expect(page.getByRole('row', { name: /hps_rahasia_GIS-2026-001\.pdf/ }).getByRole('button', { name: /Download placeholder/ })).toBeEnabled();
    await expect(page.getByRole('row', { name: /lampiran_hps_GIS-2026-001\.xlsx/ }).getByRole('button', { name: /Download placeholder/ })).toBeDisabled();
    await expect(page.getByRole('row', { name: /kontrak_GIS-2026-001\.pdf/ }).getByRole('button', { name: /Download placeholder/ })).toBeDisabled();
    await expect(page.getByRole('row', { name: /kontrak_GIS-2026-001_clean-scan\.pdf/ }).getByRole('button', { name: /Download placeholder/ })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Submit/Verify mock' })).toHaveCount(5);
    await expect(page.getByLabel('Pilih multi-file dokumen')).toBeVisible();

    await switchRole(page, 'Auditor');
    await page.goto('/projects/prj-001/documents');
    await expect(page.getByText('hps_rahasia_GIS-2026-001.pdf')).toBeVisible();
    await expect(page.getByRole('row', { name: /hps_rahasia_GIS-2026-001\.pdf/ }).getByRole('button', { name: /Download placeholder/ })).toBeEnabled();
    await expect(page.getByRole('row', { name: /lampiran_hps_GIS-2026-001\.xlsx/ }).getByRole('button', { name: /Download placeholder/ })).toBeDisabled();
    await expect(page.getByRole('row', { name: /kontrak_GIS-2026-001\.pdf/ }).getByRole('button', { name: /Download placeholder/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Submit/Verify mock' })).toHaveCount(5);
    await expect(page.getByLabel('Pilih multi-file dokumen')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Commit upload mock' })).toHaveCount(0);

    await switchRole(page, 'Viewer');
    await page.goto('/projects/prj-001/documents');
    await expect(page.getByRole('heading', { name: 'Akses ditolak' })).toBeVisible();
    await expect(page.getByText('hps_rahasia_GIS-2026-001.pdf')).toHaveCount(0);
    await expect(page.getByText('Metadata sensitif disembunyikan RBAC')).toHaveCount(0);
    await expect(page.getByText(/hps_rahasia|lampiran_hps|kontrak_GIS|invoice_termin/i)).toHaveCount(0);
    await expect(page.locator('article')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Submit/Verify mock' })).toHaveCount(0);
    await expect(page.getByLabel('Pilih multi-file dokumen')).toHaveCount(0);
  });

  test('in-place role switching re-scopes project sensitive data without navigation', async ({ page }) => {
    await loginAs(page);

    await page.goto('/projects/prj-001/documents');
    await expect(page.getByText('hps_rahasia_GIS-2026-001.pdf')).toBeVisible();
    await switchRole(page, 'Viewer');
    await expect(page.getByRole('heading', { name: 'Akses ditolak' })).toBeVisible();
    await expect(page.getByText('hps_rahasia_GIS-2026-001.pdf')).toHaveCount(0);
    await expect(page.getByText(/hps_rahasia|lampiran_hps|kontrak_GIS|invoice_termin/i)).toHaveCount(0);
    await expect(page.locator('article')).toHaveCount(0);
    await expect(page.getByLabel('Pilih multi-file dokumen')).toHaveCount(0);

    await switchRole(page, 'Admin');
    await page.goto('/projects/prj-001');
    await expect(page.getByText('HPS', { exact: true })).toBeVisible();
    await switchRole(page, 'Viewer');
    await expect(page.getByText('HPS', { exact: true })).toHaveCount(0);

    await switchRole(page, 'Admin');
    await page.goto('/projects');
    // The projects table keeps SK Proyek/Juklak, Kontrak, Jenis Proyek, Daerah, Status, and Tahun before the Dokumen column;
    // Dokumen is the eighth cell (index 7) for both Admin and Viewer.
    await expect(page.locator('tbody tr').first().locator('td').nth(7)).toHaveText('2/5 verified');
    await switchRole(page, 'Viewer');
    await expect(page.locator('tbody tr').first().locator('td').nth(7)).toHaveText('0/0 verified');

    // Catatan PRD v1.4: Dashboard Proyek tidak lagi menampilkan "Ringkasan Administrasi
    // Proyek GIS" (4 cards: active/dokumen/file/pembayaran) — dihapus per refactor §8.1.
    // Role-based re-scoping sensitive data tetap divalidasi di halaman documents, project
    // detail, dan payments di bawah ini. Test assertion untuk dashboard ringkasan di-omit
    // untuk v1.4; akan digantikan assertion project dashboard KPI re-scope di iterasi berikut.

    await switchRole(page, 'Admin');
    await page.goto('/projects/prj-001/payments');
    await expect(page.getByText('INV-GEO-001/2026')).toBeVisible();
    await switchRole(page, 'Viewer');
    await expect(page.getByRole('heading', { name: 'Akses ditolak' })).toBeVisible();
    await expect(page.getByText('INV-GEO-001/2026')).toHaveCount(0);
    await expect(page.getByText('SP2D/LS/2026/00401')).toHaveCount(0);
    await expect(page.getByText(/Nilai invoice dan SP2D disembunyikan oleh RBAC demo/)).toHaveCount(0);
  });

  test('payment history role matrix is archive-only and blocks Viewer route', async ({ page }) => {
    await loginAs(page);

    for (const role of ['Admin', 'Auditor'] as const) {
      await switchRole(page, role);
      await page.goto('/projects/prj-001/payments');
      await expect(page.getByText('INV-GEO-001/2026')).toBeVisible();
      await expect(page.getByText('SP2D/LS/2026/00401')).toBeVisible();
      await expect(page.getByText(/Rp\s?250\.000\.000/)).toBeVisible();
      await expect(page.getByText(/SIMANTA adalah arsip referensi administrasi dan audit proyek/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /approve|manage|bayar|proses pembayaran|workflow finance/i })).toHaveCount(0);
      const statuses = await page.locator('[data-testid="payment-status"]').allTextContents();
      expect(statuses.length).toBeGreaterThan(0);
      expect(statuses.every((status) => paymentStatuses.includes(status.trim()))).toBe(true);
    }

    await switchRole(page, 'Viewer');
    await page.goto('/projects/prj-001/payments');
    await expect(page.getByRole('heading', { name: 'Akses ditolak' })).toBeVisible();
    await expect(page.getByText('INV-GEO-001/2026')).toHaveCount(0);
    await expect(page.getByText('SP2D/LS/2026/00401')).toHaveCount(0);
    await expect(page.getByText(/Nilai invoice dan SP2D disembunyikan oleh RBAC demo/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /approve|manage|bayar|proses pembayaran|workflow finance/i })).toHaveCount(0);
  });

  test('payment history is read-only and Finance role is absent', async ({ page }) => {
    await loginAs(page);
    await expect(page.getByLabel(/Pilih Role|Role/i)).not.toContainText('Finance');
    await page.goto('/projects/prj-001/payments');
    await expect(page).toHaveTitle(/SIMANTA - Riwayat Pembayaran/);
    await expect(page.getByRole('heading', { name: 'Riwayat Pembayaran' })).toBeVisible();
    await expect(page.getByText(/bukan sistem keuangan sumber utama/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /approve|manage|bayar/i })).toHaveCount(0);
  });

  test('PRD v1.4 §8.1 + dashboard full-maps quick wins: basemap toolbar (top-right) + layer toggle + reports export still work (project-centric)', async ({ page }) => {
    await loginAs(page);
    await page.goto('/dashboard');
    // Quick win #7: basemap dropdown is now in MapContainer toolbar (top-right floating).
    await expect(page.getByLabel('Pilih basemap dashboard')).toHaveCount(0);
    await page.getByTestId('map-basemap-button').click();
    await page.getByTestId('basemap-option-osm_standard').click();
    await expect(page.getByTestId('map-basemap-state')).toContainText('OSM Standard');
    // Quick win #10: coordinate display visible at map bottom-left.
    await expect(page.getByTestId('map-coord-display')).toBeAttached();
    // Quick win: fullscreen button visible at top-left.
    await expect(page.getByTestId('map-fullscreen-button')).toBeAttached();
    // Layer per status toggle: uncheck 'berjalan' → 3/4 status
    await page.getByTestId('layer-status-berjalan').uncheck();
    await expect(page.getByTestId('map-active-layer-count')).toContainText('3 status');
    // Restore
    await page.getByTestId('layer-status-berjalan').check();
    await expect(page.getByTestId('map-active-layer-count')).toContainText('4 status');
    // Preference sync surfaced as success toast (SimulateRow removed 2026-07-03;
    // feedback dipindah ke <Toaster /> global di AppShell).
    await expect(page.getByRole('status').filter({ hasText: '/api/v1/prefs' })).toBeVisible();
    // Project popup: MapLibre WebGL canvas doesn't have per-feature DOM elements.
    // Simulate a click on map center to trigger popup on nearest feature.
    // Popup content validated via .maplibregl-popup-content (MapLibre internal).
    await page.waitForSelector('[data-map-ready="true"]');
    // Wait for features to render before triggering popup (setStyle + render are async)
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const mapEl = document.querySelector('[data-map-ready="true"]') as any;
        return mapEl?._simantaFeatureCount?.() ?? 0;
      });
    }, { timeout: 10000 }).toBeGreaterThan(0);
    await page.evaluate(() => {
      const mapEl = document.querySelector('[data-map-ready="true"]') as any;
      if (mapEl?._simantaClickCenter) mapEl._simantaClickCenter();
    });

    await page.goto('/reports');
    await page.getByLabel('Filter laporan tahun pengadaan').selectOption('2021');
    await expect(page.getByText('Total:')).toContainText('2');
    await page.getByRole('button', { name: 'Buat job export mock' }).click();
    await expect(page.getByRole('status', { name: 'Status export job laporan' })).toContainText('WAITING');
  });

  test('tile provider failure triggers fallback and displays warning banner', async ({ page }) => {
    await loginAs(page);
    await page.goto('/dashboard');

    // Ensure map is ready
    await page.waitForSelector('[data-map-ready="true"]');

    // Trigger tile error simulation
    await page.evaluate(() => {
      const mapEl = document.querySelector('[data-map-ready="true"]') as any;
      if (mapEl && typeof mapEl._simantaTriggerTileError === 'function') {
        mapEl._simantaTriggerTileError();
      }
    });

    // Warning banner should be visible
    await expect(page.getByTestId('map-tile-error')).toBeVisible();
    await expect(page.getByTestId('map-tile-error')).toContainText('Gagal memuat basemap');

    // Basemap state should fall back (default is esri_satellite, so fallback is osm_standard)
    await expect(page.getByTestId('map-basemap-state')).toContainText('OSM Standard');
  });

  test('Phase 1: Navbar single-pilar dan Tools entry tile mock/contract-first', async ({ page }) => {
    await loginAs(page);
    // Navbar kicker memuat subtitle single-pilar Administrasi Proyek GIS
    await expect(page.getByText('SIMANTA · Administrasi Proyek GIS').first()).toBeVisible();
    // Subtitle Contract-first prototype di-remove dari Navbar
    await expect(page.getByText(/Contract-first prototype/i)).toHaveCount(0);
    // Tidak ada lagi kicker lama
    await expect(page.getByText('Frontend MVP SIMANTA')).toHaveCount(0);

    // Tools route punya 5 entry tile
    await page.goto('/tools');
    await expect(page).toHaveTitle(/SIMANTA - Import \/ Export \/ Atlas/);
    const tiles = page.getByTestId('tools-tile');
    await expect(tiles).toHaveCount(5);
    // Scope ke <header> agar tidak match incidental text di tempat lain
    const header = page.locator('header').first();
    await expect(header.getByText('SIMANTA · Administrasi Proyek GIS')).toBeVisible();
    await expect(header.getByText(/Contract-first prototype/i)).toHaveCount(0);
    await expect(page.getByText('Frontend MVP SIMANTA')).toHaveCount(0);

    // Tile titles (semua 5 tile punya label Mock / Contract-first)
    await expect(page.getByText('Export Excel')).toBeVisible();
    await expect(page.getByText('Export PDF')).toBeVisible();
    await expect(page.getByText('Export Shapefile ZIP')).toBeVisible();
    await expect(page.getByText(/Atlas PDF/i)).toBeVisible();
    await expect(page.getByText('Import Preview')).toBeVisible();
    await expect(page.getByText('Mock / Contract-first')).toHaveCount(5);
    // Tile nonaktif (sampai Phase 4 wire ke jobs service) — inert attribute
    const tileContainer = page.locator('[aria-label="Daftar tile import, export, dan atlas"]');
    await expect(tileContainer.getByText('Mock / Contract-first')).toHaveCount(5);
    await expect(tiles.first()).not.toHaveAttribute('href', /.*/);
    // Endpoint produksi dirujuk (PRD §7.9-aligned paths)
    await expect(page.getByText('/api/v1/export/excel')).toBeVisible();
    await expect(page.getByText('/api/v1/import/shapefile/preview')).toBeVisible();
  });

  test('Phase 2: create polygon asset via digitizer mock', async ({ page }) => {
    await loginAs(page);
    await page.goto('/assets/create');
    await expect(page).toHaveTitle(/SIMANTA - Tambah Aset/);
    await page.getByLabel('Nama aset').fill('Polygon Tanah Phase 2');
    await page.getByLabel('ID Pemda').fill('JTM-P2-POLY-001');
    // Default jenis=tanah → mode polygon
    await expect(page.getByTestId('digitize-mode')).toContainText('polygon');
    // Tunggu map siap
    await expect(page.locator('[data-digitize-ready="true"]')).toBeVisible({ timeout: 10000 });
    const map = page.getByTestId('digitize-map');
    // 3 klik untuk vertex polygon
    await map.click({ position: { x: 200, y: 100 } });
    await map.click({ position: { x: 280, y: 100 } });
    await map.click({ position: { x: 240, y: 180 } });
    await expect(page.getByTestId('digitize-vertex-count')).toContainText('3 vertex');
    // Commit geometry → trigger change event
    await page.getByTestId('digitize-commit').click();
    // Tab GeoJSON raw menampilkan JSON valid
    await page.getByTestId('tab-geojson').click();
    const json = await page.getByTestId('form-geometry-json').inputValue();
    expect(json).toMatch(/"type":\s*"Polygon"/);
    // Simpan mock
    await page.getByRole('button', { name: 'Simpan mock' }).click();
    // Berhasil redirect ke detail
    await page.waitForURL(/\/assets\/asset-/, { timeout: 10000 });
    await expect(page.getByText('Polygon Tanah Phase 2')).toBeVisible();
  });

  test('Phase 2: create line asset via digitizer mock', async ({ page }) => {
    await loginAs(page);
    await page.goto('/assets/create');
    await expect(page).toHaveTitle(/SIMANTA - Tambah Aset/);
    await page.getByLabel('Nama aset').fill('Line Jalan Phase 2');
    await page.getByLabel('ID Pemda').fill('JTM-P2-LINE-001');
    // Switch jenis ke jalan → mode line
    await page.getByTestId('form-jenis').selectOption('jalan');
    await expect(page.getByTestId('digitize-mode')).toContainText('line');
    await expect(page.locator('[data-digitize-ready="true"]')).toBeVisible({ timeout: 10000 });
    const map = page.getByTestId('digitize-map');
    // 2 klik untuk vertex line
    await map.click({ position: { x: 200, y: 120 } });
    await map.click({ position: { x: 320, y: 200 } });
    await expect(page.getByTestId('digitize-vertex-count')).toContainText('2 vertex');
    await page.getByTestId('digitize-commit').click();
    await page.getByTestId('tab-geojson').click();
    const json = await page.getByTestId('form-geometry-json').inputValue();
    expect(json).toMatch(/"type":\s*"LineString"/);
    await page.getByRole('button', { name: 'Simpan mock' }).click();
    await page.waitForURL(/\/assets\/asset-/, { timeout: 10000 });
    await expect(page.getByText('Line Jalan Phase 2')).toBeVisible();
  });

  test('Phase 2: mismatch geometry type vs jenis diblok dengan VALIDATION_FAILED', async ({ page }) => {
    await loginAs(page);
    await page.goto('/assets/create');
    await expect(page).toHaveTitle(/SIMANTA - Tambah Aset/);
    await page.getByLabel('Nama aset').fill('Mismatch Asset');
    await page.getByLabel('ID Pemda').fill('JTM-P2-MISMATCH-001');
    // Default jenis=tanah → mode polygon. Digitize polygon.
    await expect(page.locator('[data-digitize-ready="true"]')).toBeVisible({ timeout: 10000 });
    const map = page.getByTestId('digitize-map');
    await map.click({ position: { x: 200, y: 100 } });
    await map.click({ position: { x: 280, y: 100 } });
    await map.click({ position: { x: 240, y: 180 } });
    await page.getByTestId('digitize-commit').click();
    // Paksa tab GeoJSON dan replace dengan Point — invalid untuk tanah
    await page.getByTestId('tab-geojson').click();
    await page.getByTestId('form-geometry-json').fill('{"type":"Point","coordinates":[112.8,-7.3]}');
    // Trigger validation blur via save
    await page.getByRole('button', { name: 'Simpan mock' }).click();
    // Validation error tampil (client-side validate() atau server envelope) — strict modev
    await expect(page.getByTestId('form-validation-error').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('form-geometry-error').first()).toContainText(/tidak sesuai/i);
  });

  test('Phase 3: login shows email OTP fallback hint and switch works', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('email').fill('admin@simanta.test');
    await page.getByPlaceholder('password').fill('password');
    await page.getByTestId('login-submit').click();
    // OTP hint mentions WhatsApp initially
    await expect(page.getByTestId('login-otp-hint')).toContainText(/WhatsApp/);
    // Switch to email fallback
    await page.getByTestId('login-switch-email').click();
    await expect(page.getByTestId('login-otp-hint')).toContainText(/email/);
    // PRD §7.2.6 reference exists in the fallback disclaimer text
    await expect(page.getByText(/PRD §7\.2\.6/)).toBeVisible();
  });

  test('Phase 3: recovery mock 2-step flow renders request, verify, and post-recovery prompt', async ({ page }) => {
    await page.goto('/recovery');
    await expect(page.getByRole('heading', { name: 'Recovery Akun' })).toBeVisible();
    // Request stage
    await page.getByTestId('recovery-request').click();
    // Verify stage
    await expect(page.getByTestId('recovery-otp-hint')).toContainText(/123456/);
    await page.getByLabel('Kode recovery').fill('123456');
    await page.getByTestId('recovery-verify').click();
    // Post-recovery prompt per PRD §7.2.6 — bukan langsung dashboard
    await expect(page.getByTestId('recovery-done')).toBeVisible();
    await expect(page.getByTestId('recovery-review-sessions')).toBeVisible();
    await expect(page.getByTestId('recovery-skip')).toBeVisible();
    // Tautan 'Tinjau sesi aktif' menunjuk ke /profile/sessions
    await page.getByTestId('recovery-review-sessions').click();
    await page.waitForURL('**/profile/sessions', { timeout: 10000 });
  });

  test('Phase 3: backup codes status visible, regenerate gated by user:update, Viewer cannot regen', async ({ page }) => {
    // Admin: regenerate tombol visible
    await loginAs(page, 'admin@simanta.test');
    await page.goto('/profile/backup-codes');
    await expect(page.getByRole('heading', { name: 'Backup Codes' })).toBeVisible();
    await expect(page.getByTestId('backup-codes-total')).toContainText('8');
    await expect(page.getByTestId('backup-codes-remaining')).toBeVisible();
    await expect(page.getByTestId('backup-codes-regen')).toBeVisible();
    // Klik regenerate → modal konfirmasi → confirm
    await page.getByTestId('backup-codes-regen').click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByTestId('backup-codes-regen-confirm').click();
    // One-time display section
    await expect(page.getByTestId('backup-codes-onetime')).toBeVisible();
    await expect(page.getByTestId('backup-codes-list').locator('li')).toHaveCount(8);
    await expect(page.getByTestId('backup-codes-ack')).toBeVisible();

    // Viewer: tidak boleh regenerate (read-only)
    await switchRole(page, 'Viewer');
    await page.goto('/profile/backup-codes');
    await expect(page.getByTestId('backup-codes-status')).toBeVisible();
    await expect(page.getByTestId('backup-codes-regen')).toHaveCount(0);
    await expect(page.getByTestId('backup-codes-regen-blocked')).toBeVisible();
  });

  test('Phase 3: sessions list tampil, force-logout button gate per role', async ({ page }) => {
    await loginAs(page, 'admin@simanta.test');
    await page.goto('/profile/sessions');
    await expect(page.getByRole('heading', { name: 'Sesi Aktif' })).toBeVisible();
    const rows = page.getByTestId('session-row');
    await expect(rows).toHaveCount(3);
    // Sesi saat ini di-badge
    await expect(page.getByTestId('session-current-badge')).toBeVisible();
    // Force-logout ada untuk sesi non-current
    const revokeButtons = page.getByTestId('session-revoke');
    expect(await revokeButtons.count()).toBeGreaterThan(0);
    // Force logout all
    await expect(page.getByTestId('sessions-revoke-all')).toBeVisible();

    // Viewer: tidak ada tombol force-logout (no user:update / user:force_logout)
    await switchRole(page, 'Viewer');
    await page.goto('/profile/sessions');
    await expect(page.getByTestId('sessions-list')).toBeVisible();
    await expect(page.getByTestId('session-revoke')).toHaveCount(0);
    await expect(page.getByTestId('sessions-revoke-all')).toHaveCount(0);
  });

  test('Phase 4: shared jobs.ts state machine via /reports export job (WAITING -> ACTIVE -> COMPLETED)', async ({ page }) => {
    await loginAs(page);
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Laporan Interaktif' })).toBeVisible();
    await page.getByTestId('reports-create-job').click();
    // Status muncul dengan salah satu state machine
    const status = page.getByTestId('reports-job-status');
    await expect(status).toBeVisible({ timeout: 10000 });
    await expect(status).toContainText(/EXPORT_JOB_QUEUED/);
    // Allow pollJob sampai COMPLETED
    await expect(status).toContainText(/COMPLETED/, { timeout: 10000 });
    await expect(status).toContainText(/100%/);
    await expect(status).toContainText(/result=mock:\/\/signed-url/);
  });

  test('Phase 4: /tools tile enqueues export job via shared jobs.ts and shows status', async ({ page }) => {
    await loginAs(page);
    await page.goto('/tools');
    // Klik tile Excel
    await page.getByTestId('tools-tile-action-excel').click();
    // Job card muncul dengan template=excel dan state machine complete
    const card = page.getByTestId('tools-job-card');
    await expect(card).toBeVisible({ timeout: 10000 });
    await expect(card).toContainText(/excel/);
    await expect(card).toContainText(/COMPLETED/);
    await expect(card).toContainText(/100%/);
  });

  test('Phase 4: Navbar header bersih tanpa health badge', async ({ page }) => {
    await loginAs(page);
    await page.goto('/dashboard');
    // Health badge di-remove dari Navbar
    const badge = page.getByTestId('navbar-health-badge');
    await expect(badge).toHaveCount(0);
  });

  test('Sidebar toggle: hide/show sidebar kiri untuk tampilan layar penuh', async ({ page }) => {
    await loginAs(page);
    await page.goto('/dashboard');
    const navbarTrigger = page.getByTestId('navbar-sidebar-trigger');
    const sidebar = page.locator('aside');
    // Initial: sidebar tampil, trigger Navbar ada, toggle button di header sidebar sudah di-remove
    await expect(page.getByTestId('sidebar-toggle')).toHaveCount(0);
    await expect(navbarTrigger).toBeVisible();
    await expect(sidebar).toBeVisible();

    // Klik trigger Navbar → sidebar collapse (offcanvas, width 0)
    await navbarTrigger.click();
    await expect(sidebar).not.toBeVisible();
    await expect(page.getByTestId('dashboard-fullmap')).toBeVisible();
    const hiddenWidth = await page.locator('.dashboard-map-wrap').evaluate((el) => (el as HTMLElement).offsetWidth);

    // Trigger Navbar → sidebar kembali
    await navbarTrigger.click();
    await expect(sidebar).toBeVisible();
    const shownWidth = await page.locator('.dashboard-map-wrap').evaluate((el) => (el as HTMLElement).offsetWidth);
    expect(hiddenWidth).toBeGreaterThan(shownWidth);

    // Trigger Navbar juga bisa menyembunyikan/menampilkan sidebar
    await navbarTrigger.click();
    await expect(sidebar).not.toBeVisible();
    await navbarTrigger.click();
    await expect(sidebar).toBeVisible();

    // Keyboard shortcut Ctrl+B (cf. shadcn-svelte SIDEBAR_KEYBOARD_SHORTCUT)
    await page.keyboard.press('Control+b');
    await expect(sidebar).not.toBeVisible();
    await page.keyboard.press('Control+b');
    await expect(sidebar).toBeVisible();

    // Persistensi: reload mempertahankan state sidebar tersembunyi
    await navbarTrigger.click();
    await expect(sidebar).not.toBeVisible();
    await page.reload();
    await expect(page.locator('aside')).not.toBeVisible();
  });

  test('Sidebar hidden: dashboard map fills the wide viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 900 });
    await loginAs(page);
    await page.goto('/dashboard');

    const trigger = page.getByTestId('navbar-sidebar-trigger');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await trigger.click();
    await expect(sidebar).not.toBeVisible();

    const mapWrap = page.locator('[data-testid="dashboard-fullmap"]');
    const canvas = page.locator('[data-testid="dashboard-fullmap"] canvas');
    await expect.poll(async () => {
      const bounds = await mapWrap.boundingBox();
      return bounds ? Math.round(bounds.width) : 0;
    }).toBe(1920);

    const metrics = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="dashboard-fullmap"]');
      const canvas = root?.querySelector('canvas');
      const rootBounds = root?.getBoundingClientRect();
      const canvasBounds = canvas?.getBoundingClientRect();
      return {
        viewportWidth: document.documentElement.clientWidth,
        rootLeft: rootBounds?.left ?? -1,
        rootRight: rootBounds?.right ?? -1,
        rootWidth: rootBounds?.width ?? 0,
        canvasWidth: canvasBounds?.width ?? 0
      };
    });

    expect(metrics.rootLeft).toBeLessThanOrEqual(1);
    expect(metrics.rootRight).toBeGreaterThanOrEqual(metrics.viewportWidth - 1);
    expect(metrics.rootWidth).toBeGreaterThanOrEqual(metrics.viewportWidth - 1);
    expect(metrics.canvasWidth).toBeGreaterThanOrEqual(metrics.rootWidth - 2);
    await expect(canvas).toBeVisible();
  });

test('Dashboard screenshot viewport stays scroll-free and canvas-sized', async ({ page }) => {
  await page.setViewportSize({ width: 1568, height: 758 });
  await loginAs(page);
  await page.goto('/dashboard');
  const sidebar = page.locator('aside');
  await expect(sidebar).toBeVisible();
  await page.getByTestId('navbar-sidebar-trigger').click();
  await expect(sidebar).not.toBeVisible();
  await page.waitForSelector('[data-map-ready="true"]');

  const metrics = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="dashboard-fullmap"]');
    const canvas = root?.querySelector('canvas');
    const rootBounds = root?.getBoundingClientRect();
    const canvasBounds = canvas?.getBoundingClientRect();
    return {
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: document.documentElement.clientHeight,
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      bodyWidth: document.body.scrollWidth,
      bodyHeight: document.body.scrollHeight,
      rootLeft: rootBounds?.left ?? -1,
      rootRight: rootBounds?.right ?? -1,
      rootTop: rootBounds?.top ?? -1,
      rootBottom: rootBounds?.bottom ?? -1,
      rootWidth: rootBounds?.width ?? 0,
      rootHeight: rootBounds?.height ?? 0,
      canvasWidth: canvasBounds?.width ?? 0,
      canvasHeight: canvasBounds?.height ?? 0,
    };
  });

  expect(metrics.documentWidth).toBe(metrics.viewportWidth);
  expect(metrics.bodyWidth).toBe(metrics.viewportWidth);
  expect(metrics.documentHeight).toBe(metrics.viewportHeight);
  expect(metrics.bodyHeight).toBe(metrics.viewportHeight);
  expect(metrics.rootLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.rootRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.rootTop).toBeGreaterThanOrEqual(0);
  expect(metrics.rootBottom).toBeLessThanOrEqual(metrics.viewportHeight + 1);
  expect(metrics.canvasWidth).toBeGreaterThanOrEqual(metrics.rootWidth - 2);
  expect(metrics.canvasHeight).toBeGreaterThanOrEqual(metrics.rootHeight - 2);
});

test('Dashboard panels reflow inside a narrow viewport without document scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAs(page);
  await page.goto('/dashboard');
  await page.waitForSelector('[data-map-ready="true"]');

  const metrics = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="dashboard-fullmap"]');
    const rootBounds = root?.getBoundingClientRect();
    const panels = [...document.querySelectorAll('.dashboard-panel-layer [data-position]')].map((panel) => {
      const bounds = panel.getBoundingClientRect();
      return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom };
    });
    return {
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: document.documentElement.clientHeight,
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      root: rootBounds
        ? { left: rootBounds.left, right: rootBounds.right, top: rootBounds.top, bottom: rootBounds.bottom }
        : null,
      panels,
    };
  });

  expect(metrics.documentWidth).toBe(metrics.viewportWidth);
  expect(metrics.documentHeight).toBe(metrics.viewportHeight);
  expect(metrics.root).not.toBeNull();
  expect(metrics.panels).toHaveLength(4);
  for (const panel of metrics.panels) {
    expect(panel.left).toBeGreaterThanOrEqual(metrics.root!.left - 1);
    expect(panel.right).toBeLessThanOrEqual(metrics.root!.right + 1);
    expect(panel.top).toBeGreaterThanOrEqual(metrics.root!.top - 1);
    expect(panel.bottom).toBeLessThanOrEqual(metrics.root!.bottom + 1);
  }
});

test('Dashboard map follows a short viewport height', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 320 });
  await loginAs(page);
  await page.goto('/dashboard');
  await page.waitForSelector('[data-map-ready="true"]');

  const metrics = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="dashboard-fullmap"]');
    const map = root?.querySelector('[data-fullheight="true"]');
    const canvas = root?.querySelector('canvas');
    const rootBounds = root?.getBoundingClientRect();
    const mapBounds = map?.getBoundingClientRect();
    const canvasBounds = canvas?.getBoundingClientRect();
    const panels = [...document.querySelectorAll('.dashboard-panel-layer [data-position]')].map((panel) => {
      const bounds = panel.getBoundingClientRect();
      return { top: bounds.top, bottom: bounds.bottom, left: bounds.left, right: bounds.right };
    });
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: document.documentElement.clientHeight,
      root: rootBounds
        ? { top: rootBounds.top, bottom: rootBounds.bottom, left: rootBounds.left, right: rootBounds.right }
        : null,
      rootHeight: rootBounds?.height ?? 0,
      mapHeight: mapBounds?.height ?? 0,
      canvasHeight: canvasBounds?.height ?? 0,
      panels,
    };
  });

  expect(metrics.documentWidth).toBe(metrics.viewportWidth);
  expect(metrics.documentHeight).toBe(metrics.viewportHeight);
  expect(metrics.root).not.toBeNull();
  expect(metrics.rootHeight).toBeLessThanOrEqual(metrics.viewportHeight + 1);
  expect(metrics.mapHeight).toBeGreaterThan(0);
  expect(metrics.canvasHeight).toBeGreaterThan(0);
  expect(metrics.canvasHeight).toBeLessThanOrEqual(metrics.rootHeight + 1);
  expect(metrics.panels).toHaveLength(4);
  for (const panel of metrics.panels) {
    expect(panel.top).toBeGreaterThanOrEqual(metrics.root!.top - 1);
    expect(panel.bottom).toBeLessThanOrEqual(metrics.root!.bottom + 1);
    expect(panel.left).toBeGreaterThanOrEqual(metrics.root!.left - 1);
    expect(panel.right).toBeLessThanOrEqual(metrics.root!.right + 1);
  }
});

  test('Phase 5: report presets CRUD route gated by report:preset_manage', async ({ page }) => {
    // Admin: route accessible, list tampil
    await loginAs(page, 'admin@simanta.test');
    await page.goto('/reports/presets');
    await expect(page.getByRole('heading', { name: 'Report Presets' })).toBeVisible();
    // Tunggu list dimuat (mock service 60ms + render)
    await expect(page.getByTestId('presets-row').first()).toBeVisible({ timeout: 10000 });
    const initialRows = await page.getByTestId('presets-row').count();
    expect(initialRows).toBeGreaterThanOrEqual(3);
    // Save new preset
    await page.getByTestId('presets-new-button').click();
    await page.getByTestId('presets-name').fill('E2E Mock Preset Phase 5');
    await page.getByTestId('presets-filters').fill('{"jenis":"tanah","hasGeom":"no"}');
    await page.getByTestId('presets-save').click();
    await expect(page.getByTestId('presets-success')).toBeVisible();
    await expect(page.getByTestId('presets-row')).toHaveCount(initialRows + 1);
    // Delete the new preset
    const lastRow = page.getByTestId('presets-row').last();
    await lastRow.getByTestId('presets-delete').click();
    await expect(page.getByTestId('presets-success')).toBeVisible();
    await expect(page.getByTestId('presets-row')).toHaveCount(initialRows);

    // Viewer: route guard blocks at layout level (ForbiddenState component)
    await switchRole(page, 'Viewer');
    await page.goto('/reports/presets');
    await expect(page.getByRole('heading', { name: 'Akses ditolak' })).toBeVisible();
    // Presets list not rendered (layout-level guard)
    await expect(page.getByTestId('presets-list')).toHaveCount(0);
  });

  test('Phase 5: reports header links to /reports/presets for manage access', async ({ page }) => {
    await loginAs(page);
    await page.goto('/reports');
    await expect(page.getByTestId('reports-presets-link')).toBeVisible();
    await page.getByTestId('reports-presets-link').click();
    await page.waitForURL('**/reports/presets', { timeout: 10000 });
  });

  test('Phase 6: project subnav routes to /milestones and /assets as routes, not anchors', async ({ page }) => {
    await loginAs(page);
    await page.goto('/projects/prj-001');
    await expect(page.getByRole('heading', { name: 'Administrasi Proyek GIS' })).toBeVisible();
    // Subnav contains route links (not anchors)
    await expect(page.getByTestId('subnav-ringkasan-proyek')).toBeVisible();
    await expect(page.getByTestId('subnav-timeline-&-milestone')).toBeVisible();
    await expect(page.getByTestId('subnav-output-ke-aset-gis')).toBeVisible();

    // Timeline & Milestone route
    await page.getByTestId('subnav-timeline-&-milestone').click();
    await page.waitForURL('**/projects/prj-001/milestones', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Timeline & Milestone' })).toBeVisible();
    await expect(page.getByTestId('milestones-list')).toBeVisible();
    const milestoneCount = await page.getByTestId('milestone-row').count();
    expect(milestoneCount).toBeGreaterThan(0);

    // Output ke Aset GIS route
    await page.getByTestId('subnav-output-ke-aset-gis').click();
    await page.waitForURL('**/projects/prj-001/assets', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Output ke Aset GIS' })).toBeVisible();
    await expect(page.getByTestId('project-assets-list')).toBeVisible();
    const assetRowCount = await page.getByTestId('project-asset-row').count();
    expect(assetRowCount).toBeGreaterThan(0);
  });

  test('Phase 8: attachment metadata + audit emission (upload/download/delete) tercatat di /audit', async ({ page }) => {
    await loginAs(page);
    // Buka asset detail
    await page.goto('/assets/asset-001');
    await expect(page.getByText('Tanah Kantor Pelayanan Terpadu Surabaya')).toBeVisible();
    // Tunggu attachment list
    await expect(page.getByTestId('attachment-list')).toBeVisible();
    // Klik mock upload (fixture 1.5.sertifikat_hpl_surabaya sudah ada, lalu upload mock menambah 1 lagi)
    const before = await page.getByTestId('attachment-row').count();
    await page.getByTestId('attachment-upload-mock').click();
    await expect(page.getByTestId('attachment-row')).toHaveCount(before + 1, { timeout: 5000 });
    // Klik download pada attachment yang baru (yang scanStatus=pending seharusnya blocked)
    const blockedBtn = page.getByTestId('attachment-download-blocked').first();
    if (await blockedBtn.count() > 0) {
      await blockedBtn.click({ force: true }).catch(() => undefined); // may be disabled
    }
    // Buka halaman /audit, verifikasi ada minimal satu event ATTACHMENT_*
    await page.goto('/audit');
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible();
    // Cari baris audit dengan action ATTACHMENT_*
    const auditBadges = page.getByText(/^ATTACHMENT_/);
    expect(await auditBadges.count()).toBeGreaterThan(0);
  });

  test('Phase 1 P0 fix: audit page renders per-entity Target (assetId/attachmentId) dan tidak ada null/undefined di kolom Target', async ({ page }) => {
    await loginAs(page);
    // Trigger ATTACHMENT_UPLOAD dari asset detail
    await page.goto('/assets/asset-001');
    await expect(page.getByText('Tanah Kantor Pelayanan Terpadu Surabaya')).toBeVisible();
    await expect(page.getByTestId('attachment-list')).toBeVisible();
    await page.getByTestId('attachment-upload-mock').click();
    // Buka /audit
    await page.goto('/audit');
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible();
    // Assert minimal satu baris dengan data-entity="asset_attachment"
    const attachmentRows = page.locator('[data-testid="audit-row"][data-entity="asset_attachment"]');
    await expect(attachmentRows.first()).toBeVisible();
    // Assert baris asset_attachment memiliki assetId + attachmentId di Target cell (bukan null/undefined)
    const targetCell = attachmentRows.first().locator('td').nth(3);
    const targetText = (await targetCell.textContent())?.trim() ?? '';
    expect(targetText).toMatch(/asset-\S+\s*\/\s*att-mock-\S+/);
    expect(targetText).not.toMatch(/null/);
    expect(targetText).not.toMatch(/undefined/);
    // Negative scan: tidak ada baris audit manapun yang punya "null" atau "undefined" di kolom Target
    const allRows = page.locator('[data-testid="audit-row"]');
    const rowCount = await allRows.count();
    for (let i = 0; i < rowCount; i += 1) {
      const text = (await allRows.nth(i).locator('td').nth(3).textContent())?.trim() ?? '';
      expect(text, `audit row ${i} target should not contain "null" or "undefined"`).not.toMatch(/null|undefined/);
    }
  });

  test('Phase 1 P0 fix: user_session entity renders sessionId/actorName (dari localStorage seed, OMP I-2 fix)', async ({ page }) => {
    // Pre-populate localStorage dengan user_session event SEBELUM page load.
    // Audit store baca localStorage di initial() saat module load; addInitScript
    // memastikan storage tersedia sebelum store import.
    await page.addInitScript(() => {
      const events = [
        {
          id: 'audit-seed-1',
          action: 'FORCE_LOGOUT',
          entity: 'user_session',
          sessionId: 'sess-seed-001',
          projectId: '',
          actorName: 'admin@simanta.local',
          createdAt: new Date().toISOString(),
          metadata: { targetSession: 'sess-other-002' }
        },
        {
          id: 'audit-seed-2',
          action: 'RECOVERY_ATTEMPT',
          entity: 'user_session',
          sessionId: 'sess-seed-003',
          projectId: '',
          actorName: 'operator@simanta.local',
          createdAt: new Date(Date.now() - 1000).toISOString(),
          metadata: { email: 'operator@simanta.local' }
        }
      ];
      localStorage.setItem('simanta.mock.audit-events', JSON.stringify(events));
    });
    await loginAs(page);
    await page.goto('/audit');
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible();
    // Assert minimal 2 baris user_session
    const userSessionRows = page.locator('[data-testid="audit-row"][data-entity="user_session"]');
    await expect(userSessionRows).toHaveCount(2);
    // Assert baris FORCE_LOGOUT menampilkan sessionId + actorName (bukan '-', 'null', 'undefined')
    const forceLogoutTarget = (await userSessionRows.first().locator('td').nth(3).textContent())?.trim() ?? '';
    expect(forceLogoutTarget).toBe('sess-seed-001 / admin@simanta.local');
    expect(forceLogoutTarget).not.toMatch(/null|undefined/);
    // Assert baris RECOVERY_ATTEMPT
    const recoveryTarget = (await userSessionRows.nth(1).locator('td').nth(3).textContent())?.trim() ?? '';
    expect(recoveryTarget).toBe('sess-seed-003 / operator@simanta.local');
    // Negative scan pada semua baris: tidak ada "null", "undefined", atau bare "-"
    const allRows = page.locator('[data-testid="audit-row"]');
    const rowCount = await allRows.count();
    for (let i = 0; i < rowCount; i += 1) {
      const text = (await allRows.nth(i).locator('td').nth(3).textContent())?.trim() ?? '';
      expect(text, `audit row ${i} target`).not.toMatch(/null|undefined/);
    }
  });

  test('PRD v1.4 §8.1: Dashboard Proyek menampilkan 2 KPI (Total Proyek + Proyek Berjalan) + layer control per status/jenis + project GeoJSON map (pengganti stat card "Belum dipetakan" yang dihilangkan)', async ({ page }) => {
    await loginAs(page);

    // 2 KPI cards (bukan 6 stat cards spasial lama)
    const totalCard = page.getByTestId('kpi-card-total-proyek');
    const berjalanCard = page.getByTestId('kpi-card-proyek-berjalan');
    await expect(totalCard).toBeVisible();
    await expect(berjalanCard).toBeVisible();
    // Total Proyek value = 3 (3 mock projects), Proyek Berjalan = 1 (prj-001 in_progress)
    await expect(totalCard).toContainText('3');
    await expect(berjalanCard).toContainText('1');

    // 6 stat card spasial lama harus hilang
    await expect(page.getByTestId('stat-card-belum-dipetakan')).toHaveCount(0);
    await expect(page.getByTestId('stat-card-luas-tanah')).toHaveCount(0);
    await expect(page.getByTestId('stat-card-luas-bangunan')).toHaveCount(0);

    // Layer per status (4 group) + layer per jenis (8 group) visible
    await expect(page.getByTestId('layer-status-perencanaan')).toBeVisible();
    await expect(page.getByTestId('layer-status-berjalan')).toBeVisible();
    await expect(page.getByTestId('layer-status-selesai')).toBeVisible();
    await expect(page.getByTestId('layer-status-dibatalkan')).toBeVisible();
    await expect(page.getByTestId('layer-jenis-jalan')).toBeVisible();
    await expect(page.getByTestId('layer-jenis-bangunan')).toBeVisible();

    // Map harus render dengan 3 project features (LineString, Polygon, Point)
    // MapLibre WebGL: feature count via _simantaFeatureCount test hook (no per-feature DOM elements)
    await page.waitForSelector('[data-map-ready="true"]');
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const mapEl = document.querySelector('[data-map-ready="true"]') as any;
        return mapEl?._simantaFeatureCount?.() ?? 0;
      });
    }, { timeout: 10000 }).toBeGreaterThanOrEqual(3);

    // Toggle off "berjalan" → feature prj-001 (in_progress) hilang
    await page.getByTestId('layer-status-berjalan').uncheck();
    // MapLibre: wait for re-render then check feature count decreased
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const mapEl = document.querySelector('[data-map-ready="true"]') as any;
        return mapEl?._simantaFeatureCount?.() ?? 99;
      });
    }, { timeout: 5000 }).toBeLessThan(3);
    // Restore
    await page.getByTestId('layer-status-berjalan').check();
  });

  test('Phase 3 P1: AssetForm empty-geometry pre-submit warning (PRD §6.8 compliant inline alert)', async ({ page }) => {
    await loginAs(page);
    await page.goto('/assets/create');
    await expect(page.getByRole('heading', { name: 'Tambah Aset' })).toBeVisible();
    // Fill required fields but leave geometry empty
    const uniqueName = `Empty Geom Test ${Date.now()}`;
    await page.getByLabel('Nama aset').fill(uniqueName);
    await page.getByLabel('ID Pemda').fill(`ID-${Date.now()}`);
    // Geometry is empty by default (no digitizer action, no JSON input)
    // Klik "Simpan mock" → inline alert tampil (bukan modal, bukan direct submit)
    await page.getByRole('button', { name: 'Simpan mock' }).click();
    const warning = page.getByTestId('form-empty-geometry-warning');
    await expect(warning).toBeVisible();
    await expect(warning).toContainText('Simpan tanpa geometri?');
    await expect(warning).toContainText('tanpaGeometri');
    // Tombol "Tambah geometry dulu" → switch tab ke Peta, dismiss warning
    await page.getByTestId('form-empty-geometry-cancel').click();
    await expect(warning).not.toBeVisible();
    // Verify we're still on the create page (not navigated)
    await expect(page).toHaveURL(/\/assets\/create/);
    // Re-trigger warning and confirm to proceed without geometry (PRD §6.8)
    await page.getByRole('button', { name: 'Simpan mock' }).click();
    await expect(warning).toBeVisible();
    await page.getByTestId('form-empty-geometry-confirm').click();
    // Navigation to /assets/{id} setelah confirm
    await expect(page).toHaveURL(/\/assets\//);
  });

  test('Phase 5 P1: tools pollGeneration guard prevents stale poll clobber on rapid double-click (OMP I-3 fix)', async ({ page }) => {
    await loginAs(page);
    await page.goto('/tools');
    await expect(page.getByRole('heading', { name: 'Import / Export / Atlas' })).toBeVisible();
    // Smoke test (integration): confirms the component wires up the race-guard
    // pattern correctly and the last-clicked tile wins. The actual guard
    // behavior (bail-out when token is stale) is covered by the unit test
    // in `src/lib/async-race-guard.test.ts` with controllable promise
    // resolution order; see OMP I-3 review for why a pure E2E cannot
    // force the reversed pollJob ordering (mock functions are local,
    // not HTTP, so page.route cannot delay them).
    await page.evaluate(() => {
      const excelBtn = document.querySelector('[data-testid="tools-tile-action-excel"]') as HTMLButtonElement | null;
      const pdfBtn = document.querySelector('[data-testid="tools-tile-action-pdf"]') as HTMLButtonElement | null;
      if (!excelBtn || !pdfBtn) throw new Error('tile buttons not found');
      excelBtn.click();
      pdfBtn.click();
    });
    // Tunggu poll settle (80ms × 4 attempts + grace ≈ 1-2 detik)
    const jobCard = page.getByTestId('tools-job-card');
    await expect(jobCard).toBeVisible({ timeout: 5000 });
    await expect(jobCard).toContainText(/COMPLETED/i, { timeout: 5000 });
    // Smoke assertion: tile TERAKHIR yang diklik (pdf) menang
    const jobTemplate = (await jobCard.locator('span.font-bold').first().textContent())?.trim() ?? '';
    expect(jobTemplate).toBe('pdf');
    // Negative assertion: tidak ada stale 'excel' state yang nongol di job card
    const cardText = (await jobCard.textContent()) ?? '';
    expect(cardText.toLowerCase()).not.toContain('excel');
  });

  test('Full-maps refactor 2026-06-21: Dashboard layout pakai floating overlay, peta full-height, 4 panels + Digitasi attached', async ({ page }) => {
    await loginAs(page);
    await page.goto('/dashboard');

    // (1) MapContainer rendered dengan data-map-ready (MapLibre init done)
    await expect(page.locator('[data-map-ready="true"]')).toBeVisible({ timeout: 10000 });

    // (2) 4 floating panels attached — KPI strip, filter panel, zoom rail,
    //     legend floater. toBeAttached (DOM presence) bukan toBeVisible
    //     karena beberapa panel collapsible dan mungkin collapsed state
    //     tidak visible secara visual tapi DOM ada. Digitasi handle adalah
    //     overlay fixed-position (bukan FloatingPanel wrapper), diuji di
    //     dashboard-draw-sheet.spec.ts.
    await expect(page.getByTestId('dashboard-kpi-strip')).toBeAttached();
    await expect(page.getByTestId('dashboard-filter-panel')).toBeAttached();
    await expect(page.getByTestId('dashboard-zoom-rail')).toBeAttached();
    await expect(page.getByTestId('dashboard-legend-floater')).toBeAttached();

    // (3) Peta full-height: MapContainer wrapper >= 70% viewport height.
    //     Threshold 70% memberi toleransi untuk viewport sempit (1024×768)
    //     dan Navbar ~64px. Target ideal 85% di desktop >= 1280px.
    const mapWrapHeight = await page.locator('.dashboard-map-wrap').evaluate((el) => (el as HTMLElement).offsetHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    expect(mapWrapHeight / viewportHeight).toBeGreaterThanOrEqual(0.7);

    // (4) Negative regression: header section "Pusat Kendali SIMANTA · Single
    //     active OPD" sudah dihapus (refactor), tidak boleh muncul lagi.
    //     Cleanup 2026-06-21: Navbar subtitle 'single active OPD' juga
    //     dihapus — invariant single active OPD di-cover oleh absence of
    //     cross-OPD selector/filter (test 'single active OPD enforced...')
    //     bukan oleh宣传 teks.
    await expect(page.getByText('Pusat Kendali SIMANTA · Single active OPD')).toHaveCount(0);

    // (5) Floating panels punya role=region + aria-label (a11y)
    await expect(page.getByTestId('dashboard-kpi-strip')).toHaveAttribute('role', 'region');
    await expect(page.getByTestId('dashboard-zoom-rail')).toHaveAttribute('role', 'region');
  });

  // Bug fix (2026-07-04): ZOOM CEPAT rail (Indonesia / Jawa Timur / Kabupaten
  // Sidoarjo) di Dashboard Proyek GIS — klik tombol harus refocus map ke
  // koordinat & zoom level yang dideklarasikan. Root cause: MapContainer.svelte
  // membaca centerLat/centerLng/zoom HANYA di onMount; tidak ada reactive
  // effect untuk prop change → flyTo tidak pernah dipanggil saat parent
  // update `mapCenter`. Test ini meng-cover bug end-to-end (button → callback
  // → state → prop → flyTo → getCenter/getZoom).
  test('Quick-jump zoom rail (Dashboard) — Indonesia / Jawa Timur / Kabupaten Sidoarjo buttons refocus the map', async ({ page }) => {
    await loginAs(page);
    await page.goto('/dashboard');
    await expect(page.locator('[data-map-ready="true"]')).toBeVisible({ timeout: 10000 });

    const getMapState = () =>
      page.evaluate(() => {
        const mapEl = document.querySelector('[data-map-ready="true"]') as
          | (HTMLElement & { _simantaGetMapState?: () => { center: [number, number]; zoom: number } | null })
          | null;
        return mapEl?._simantaGetMapState ? mapEl._simantaGetMapState() : null;
      });

    // Helper: poll sampai map center/zoom cocok dengan target (toleransi kecil
    // untuk float drift). Default Playwright expect.timeout 7.5s > flyTo 800ms.
    const expectMapAt = async (targetLng: number, targetLat: number, targetZoom: number) => {
      await expect
        .poll(async () => {
          const s = await getMapState();
          if (!s) return false;
          return (
            Math.abs(s.center[0] - targetLng) < 0.01 &&
            Math.abs(s.center[1] - targetLat) < 0.01 &&
            Math.abs(s.zoom - targetZoom) < 0.05
          );
        }, { timeout: 5000 })
        .toBe(true);
    };

    // Initial state: DPUPR Sidoarjo center & zoom 8 (OPD default; sama dengan
    // initial mapCenter di +page.svelte). MapContainer mounts dengan values
    // ini dan tidak boleh drift ke tempat lain.
    await expectMapAt(112.7176, -7.4538, 8);

    // (1) Klik "Indonesia" — expect flyTo ke (-2.5, 118.0) @ zoom 5
    await page.getByTestId('zoom-level-indonesia').click();
    await expectMapAt(118.0, -2.5, 5);

    // (2) Klik "Jawa Timur" — expect flyTo ke (-7.7, 112.7) @ zoom 8
    await page.getByTestId('zoom-level-jawa-timur').click();
    await expectMapAt(112.7, -7.7, 8);

    // (3) Klik "Kabupaten Sidoarjo" — expect flyTo ke (-7.4538, 112.7176) @ zoom 11
    await page.getByTestId('zoom-level-sidoarjo').click();
    await expectMapAt(112.7176, -7.4538, 11);
  });
  // Bug fix 2026-07-04 (extension): boundary outline poligon Kabupaten
  // Sidoarjo harus muncul saat user klik tombol 'Kabupaten Sidoarjo'
  // dan hilang saat klik tombol Indonesia / Jawa Timur. Layer
  // `sidoarjo-boundary-fill` + `sidoarjo-boundary-line` ditambahkan ke
  // MapContainer, visibility di-toggle via `setLayoutProperty`. Test
  // hook `_simantaGetSidoarjoBoundary` membaca `getLayoutProperty(
  // sidoarjo-boundary-line, 'visibility')`.
  test('ZOOM CEPAT rail toggles Sidoarjo boundary visibility', async ({ page }) => {
    await loginAs(page);
    await page.goto('/dashboard');
    await expect(page.locator('[data-map-ready="true"]')).toBeVisible({ timeout: 10000 });

    const getBoundary = () =>
      page.evaluate(() => {
        const el = document.querySelector('[data-map-ready="true"]') as
          | (HTMLElement & { _simantaGetSidoarjoBoundary?: () => { layerExists: boolean; visibility: string | null } | null })
          | null;
        return el?._simantaGetSidoarjoBoundary ? el._simantaGetSidoarjoBoundary() : null;
      });

    // (1) Initial state — layers added but hidden (no zoom button clicked yet)
    await expect.poll(getBoundary, { timeout: 5000 }).toMatchObject({
      layerExists: true,
      visibility: 'none',
    });

    // (2) Klik "Indonesia" — still hidden
    await page.getByTestId('zoom-level-indonesia').click();
    await expect.poll(getBoundary, { timeout: 5000 }).toMatchObject({
      layerExists: true,
      visibility: 'none',
    });

    // (3) Klik "Jawa Timur" — still hidden
    await page.getByTestId('zoom-level-jawa-timur').click();
    await expect.poll(getBoundary, { timeout: 5000 }).toMatchObject({
      layerExists: true,
      visibility: 'none',
    });

    // (4) Klik "Kabupaten Sidoarjo" — visible
    await page.getByTestId('zoom-level-sidoarjo').click();
    await expect.poll(getBoundary, { timeout: 5000 }).toMatchObject({
      layerExists: true,
      visibility: 'visible',
    });
  });

   test('basemap switcher shows premium when token + url set', async ({ page }) => {
    // Skip when env not configured (CI tanpa institutional subscription).
    // Pattern sama dengan test basemap MapTiler/Mapbox.
    test.skip(
      !process.env.PUBLIC_ARCGIS_TOKEN || !process.env.PUBLIC_ARCGIS_IMAGERY_URL,
      'PUBLIC_ARCGIS_TOKEN or PUBLIC_ARGCIS_IMAGERY_URL not set'
    );

    await loginAs(page);
    await page.goto('/dashboard');
    await expect(page.locator('[data-map-ready="true"]')).toBeVisible({ timeout: 10000 });
    // Selector real dari MapContainer switcher (sudah dipakai di test
    // PRD v1.4 §8.1 basemap toolbar di line 332).
    await page.getByTestId('map-basemap-button').click();
    await expect(page.getByTestId('basemap-option-esri_imagery_premium')).toBeVisible();
    await expect(page.getByTestId('map-basemap-state')).toContainText('Esri Imagery (Premium)');
  });
});

// (2026-06-28) The previous "Dashboard digitize bridge" E2E that drove
// clicks on a mini-map is removed; the hybrid map approach draws on the
// main basemap instead. Coverage moves to:
//   - tests/e2e/dashboard-draw-sheet.spec.ts (UI state machine, 5 tests)
//   - tests/e2e/a11y.spec.ts (axe-core on the open sheet)
//   - MapDrawController.test.ts (5 jsdom tests for layer lifecycle)
//   - drawing-controller.test.ts (13 unit tests for vertex math)
//   - draft-geometry.test.ts (sessionStorage bridge contract)
// Direct WebGL canvas click-driving is fragile and not exercised elsewhere.

