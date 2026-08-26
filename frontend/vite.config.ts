import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Load .env into process.env at Vite config load time — BEFORE the SvelteKit
// plugin initializes. The SvelteKit plugin reads PUBLIC_* vars at init to
// generate the $env/static/public virtual module, so any .env override
// (e.g. new PUBLIC_ARCGIS_* vars added after the last sync) must be in
// process.env before plugin init. Without this, vitest worker env diverges
// from the dev server env and tests see stale values.
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
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
  build: {
    // MapLibre is a self-contained WebGL runtime. It is lazy-loaded by map
    // components, so its 1 MB runtime is not part of the initial page payload.
    chunkSizeWarningLimit: 1_100,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // SSR externalizes the package name, whereas the client resolves its
          // physical module path. Only place the latter in the client chunk.
          if (id.includes('node_modules') && id.includes('maplibre-gl')) {
            return 'maplibre';
          }
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    server: {
      deps: {
        inline: ['svelte'],
      },
    },
    setupFiles: ['./vitest.setup.ts'],
  },
});
