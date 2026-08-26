import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Load .env into process.env at vitest startup. Vite's loadEnv / SvelteKit's
// $env/static/public do not always populate process.env for newly-added
// PUBLIC_* vars in the worker thread that runs test files. This setup runs
// before the test file is imported, so basemaps.ts module-load consts
// (which read process.env.PUBLIC_ARCGIS_TOKEN / _IMAGERY_URL) capture the
// correct values. Idempotent: only sets vars that are currently undefined.
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Always override — Vite's loadEnv may have set a stale value before this
    // setup ran (e.g. from a cached .env read), so the `=== undefined` guard
    // skipped the override. .env is the source of truth.
    process.env[key] = value;
  }
}
