# Dynamic Dashboard Map Canvas and Legend Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dashboard map fill its real content viewport and keep every floating legend/control panel inside a responsive, scroll-free layout.

**Architecture:** Route the dashboard around the shared shell's `1680px` cap through an optional `AppShell.fullWidth` prop instead of using `100vw`. Keep MapLibre's existing wrapper `ResizeObserver` and `map.resize()` scheduling. Move panel offsets to `data-position` CSS driven by safe-area custom properties, and use a narrow-width grid layer to keep KPI, filter, zoom, and legend panels inside the map bounds.

**Tech Stack:** Svelte 5/SvelteKit 2, TypeScript, Tailwind CSS v4, MapLibre GL JS 5, Playwright, Vitest, `svelte-check`, Vite.

## Global Constraints

- Only `/dashboard` may bypass the shared `1680px` content cap; all other routes keep the cap.
- Keep every existing `MapContainer` prop, event, layer, popup, drawing, basemap, center, zoom, and test hook unchanged.
- Keep the existing `ResizeObserver`, `requestAnimationFrame` resize coalescing, window resize listener, cleanup, and sidebar store API.
- Do not use `100vw` or viewport-centering margins for the dashboard map bleed.
- The document and map wrapper must not gain horizontal or vertical scrolling; panel-local scrolling is allowed only when panel contents need it.
- Preserve existing dashboard panel test IDs and the `FloatingPanel` public prop contract.
- Use Svelte 5-compatible event/attribute syntax where new markup is added; match existing file conventions otherwise.
- Skip formatters, linters, and unrelated project-wide suites during individual implementation tasks; run the complete frontend verification gate only in the final verification task.

---

## File Map

- Modify `frontend/src/routes/+layout.svelte`: pass the dashboard-only full-width flag to `AppShell`.
- Modify `frontend/src/lib/components/layout/AppShell.svelte`: add the optional `fullWidth` prop and conditionally retain the shell content cap.
- Modify `frontend/src/routes/dashboard/+page.svelte`: remove the `100vw` sidebar bleed, add responsive map CSS variables, and group the four floating panels in a responsive layer.
- Modify `frontend/src/lib/components/dashboard/FloatingPanel.svelte`: position panels with `data-position`, safe-area variables, containing-block widths, and narrow-grid overrides.
- Modify `frontend/src/lib/components/dashboard/DashboardFilterPanel.svelte`: constrain the grouping select at narrow widths.
- Modify: `frontend/src/lib/components/map/MapContainer.svelte`: remove full-height minimums and re-add boundary layers after basemap style replacement.
- Modify `frontend/tests/e2e/frontend-mvp.spec.ts`: add screenshot-size, narrow-width, and short-height scroll/canvas assertions beside the existing sidebar tests.
- Replace `docs/superpowers/plans/2026-08-20-map-canvas-resize.md`: this implementation plan.

---

### Task 1: Add failing scroll-free responsive dashboard tests

**Files:**
- Modify: `frontend/tests/e2e/frontend-mvp.spec.ts` near the existing sidebar tests at lines 619-697.
- Read: `frontend/tests/e2e/helpers.ts` for `loginAs`.

**Interfaces:**
- Consumes: `loginAs(page)`, `page.getByTestId('dashboard-fullmap')`, existing `navbar-sidebar-trigger`, and the MapLibre canvas created by `MapContainer`.
- Produces: browser regressions that fail against `100vw`/fixed-minimum behavior and define the required bounds for later layout tasks.

- [ ] **Step 1: Add the screenshot-size regression**

Insert this test after the existing wide-sidebar test:

```ts
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
```

- [ ] **Step 2: Add the narrow panel-bounds regression**

Add a test that exercises the responsive grid and checks every panel stays inside the map root:

```ts
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
  for (const panel of metrics.panels) {
    expect(panel.left).toBeGreaterThanOrEqual(metrics.root!.left - 1);
    expect(panel.right).toBeLessThanOrEqual(metrics.root!.right + 1);
    expect(panel.top).toBeGreaterThanOrEqual(metrics.root!.top - 1);
    expect(panel.bottom).toBeLessThanOrEqual(metrics.root!.bottom + 1);
  }
});
```

- [ ] **Step 3: Add the short-height canvas regression**

Add a test at `390×320` that verifies the full-height map is allowed to shrink:

```ts
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
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: document.documentElement.clientHeight,
      rootHeight: rootBounds?.height ?? 0,
      mapHeight: mapBounds?.height ?? 0,
      canvasHeight: canvasBounds?.height ?? 0,
    };
  });

  expect(metrics.documentWidth).toBe(metrics.viewportWidth);
  expect(metrics.documentHeight).toBe(metrics.viewportHeight);
  expect(metrics.rootHeight).toBeLessThanOrEqual(metrics.viewportHeight + 1);
  expect(metrics.mapHeight).toBeGreaterThan(0);
  expect(metrics.canvasHeight).toBeGreaterThan(0);
  expect(metrics.canvasHeight).toBeLessThanOrEqual(metrics.rootHeight + 1);
});
```

- [ ] **Step 4: Run only the new tests to verify RED**

Run from `frontend`:

```bash
npx playwright test tests/e2e/frontend-mvp.spec.ts -g "Dashboard (screenshot|panels|map follows)"
```

Expected: at least the screenshot or narrow bounds test fails because the current dashboard still uses the capped/viewport-unit bleed and fixed overlay arrangement. If the command fails before assertions because the dev server is unavailable, start the existing frontend test server and rerun without changing production code.

- [ ] **Step 5: Commit the failing tests**

```bash
git add frontend/tests/e2e/frontend-mvp.spec.ts
git commit -m "test(e2e): cover responsive dashboard map bounds"
```

---

### Task 2: Make only the dashboard content column full width

**Files:**
- Modify: `frontend/src/routes/+layout.svelte:21-31`.
- Modify: `frontend/src/lib/components/layout/AppShell.svelte:1-35`.
- Modify: `frontend/src/routes/dashboard/+page.svelte:1-30,205-220,315-355`.

**Interfaces:**
- Consumes: `$page.url.pathname` and the new optional `AppShell.fullWidth` boolean.
- Produces: dashboard content sized from the actual flex column; non-dashboard routes retain `max-w-[1680px]`.

- [ ] **Step 1: Add the optional shell prop**

In `AppShell.svelte`, add this declaration at the top of the script:

```ts
  export let fullWidth = false;
```

Change the capped content wrapper from:

```svelte
        <div class="relative mx-auto max-w-[1680px]">
          <slot />
        </div>
```

to:

```svelte
        <div class={`relative mx-auto ${fullWidth ? '' : 'max-w-[1680px]'}`}>
          <slot />
        </div>
```

Do not alter the outer flex, sidebar, navbar, or main padding.

- [ ] **Step 2: Enable the prop only on `/dashboard`**

In `routes/+layout.svelte`, change:

```svelte
    <AppShell>
```

to:

```svelte
    <AppShell fullWidth={$page.url.pathname === '/dashboard'}>
```

The existing `page` store import already supplies the route pathname.

- [ ] **Step 3: Remove dashboard viewport-unit bleed state**

In `routes/dashboard/+page.svelte`:

- delete `import { sidebarVisible } from "$lib/stores/layout";`;
- change the root to:

```svelte
<div class="dashboard-fullmap-layout" data-testid="dashboard-fullmap">
```

- delete `.viewport-bleed` CSS, including `width: 100vw` and both `calc(50% - 50vw)` margins;
- keep the existing responsive negative margins so they cancel `AppShell` padding.

- [ ] **Step 4: Run the existing wide sidebar tests**

Run from `frontend`:

```bash
npx playwright test tests/e2e/frontend-mvp.spec.ts -g "Sidebar"
```

Expected: existing visible/hidden sidebar assertions pass, including hidden-map width greater than shown-map width. The new screenshot test may still fail until later tasks address root height and panel layout.

- [ ] **Step 5: Commit the shell boundary change**

```bash
git add frontend/src/routes/+layout.svelte frontend/src/lib/components/layout/AppShell.svelte frontend/src/routes/dashboard/+page.svelte
git commit -m "fix(dashboard): size map from full content column"
```

---

### Task 3: Make floating panels and legends use dynamic safe-area positions

**Files:**
- Modify: `frontend/src/lib/components/dashboard/FloatingPanel.svelte:22-112`.
- Modify: `frontend/src/routes/dashboard/+page.svelte:238-299,315-355`.
- Modify: `frontend/src/lib/components/dashboard/DashboardFilterPanel.svelte:114-128`.

**Interfaces:**
- Consumes: existing `position`, `extraClasses`, title, collapse, slot, and test ID props.
- Produces: position-aware `data-position` CSS, safe-area custom properties, and a `.dashboard-panel-layer` wrapper used by the mobile grid.

- [ ] **Step 1: Replace fixed position utility mapping with data-position selectors**

In `FloatingPanel.svelte`, remove the `positionClasses` record and change the root class from:

```svelte
class={`floating-panel absolute z-[1000] ${positionClasses[position]} ${extraClasses}`}
```

to:

```svelte
class={`floating-panel z-[1000] ${extraClasses}`}
```

Keep `data-position={position}` unchanged. Replace the style rules with:

```css
.floating-panel {
    position: absolute;
    width: fit-content;
    min-width: 0;
    max-width: min(
        420px,
        calc(
            100% - var(--dashboard-inline-start, 0.75rem) -
                var(--dashboard-inline-end, 0.75rem)
        )
    );
    background-color: rgba(255, 255, 255, 0.95);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
    border: 1px solid var(--simanta-border);
    border-radius: 0.75rem;
    box-shadow:
        0 10px 25px rgba(15, 23, 42, 0.1),
        0 4px 10px rgba(15, 23, 42, 0.05);
}
:where(.floating-panel[data-position='top-left']) {
    top: var(--dashboard-top-safe, var(--dashboard-gutter, 0.75rem));
    inset-inline-start: var(--dashboard-inline-start, var(--dashboard-gutter, 0.75rem));
}
:where(.floating-panel[data-position='top-right']) {
    top: var(--dashboard-gutter, 0.75rem);
    inset-inline-end: var(--dashboard-inline-end, var(--dashboard-gutter, 0.75rem));
}
:where(.floating-panel[data-position='top-center']) {
    top: var(--dashboard-gutter, 0.75rem);
    inset-inline-start: 50%;
    transform: translateX(-50%);
}
:where(.floating-panel[data-position='right-middle']) {
    top: calc(50% - var(--dashboard-middle-lift, 2rem));
    inset-inline-end: var(--dashboard-inline-end, var(--dashboard-gutter, 0.75rem));
    transform: translateY(-50%);
}
:where(.floating-panel[data-position='bottom-right']) {
    bottom: var(--dashboard-bottom-safe, 3.5rem);
    inset-inline-end: var(--dashboard-inline-end, var(--dashboard-gutter, 0.75rem));
}
:where(.floating-panel[data-position='bottom-left']) {
    bottom: var(--dashboard-bottom-safe, 3.5rem);
    inset-inline-start: var(--dashboard-inline-start, var(--dashboard-gutter, 0.75rem));
}
.floating-panel-content {
    min-width: 0;
    padding: 0.625rem 0.75rem 0.75rem;
    max-height: min(60dvh, 32rem);
    overflow-y: auto;
    overflow-x: hidden;
}
```
Use `:where(...)` around position selectors so the existing public `extraClasses` utility nudges retain higher specificity and can override a panel's default position. The dashboard owns the narrow-grid override because `.dashboard-panel-layer` is outside the `FloatingPanel.svelte` component. Keep the shared panel component responsible only for its own panel dimensions and `data-position` offsets.

The top-left selector uses a dynamic top-safe inset to clear MapContainer's layer-count and fullscreen controls; mobile grid padding uses the same variable.

- [ ] **Step 2: Add the responsive panel layer and safe-area variables**

In `dashboard/+page.svelte`, replace the four sibling `FloatingPanel` blocks with this structure; retain each existing panel's inner component and test ID:

```svelte
        <div class="dashboard-panel-layer">
            <FloatingPanel
                position="top-left"
                title="Ringkasan"
                icon="📊"
                testId="dashboard-kpi-strip"
            >
                <DashboardKpiStrip
                    totalProyek={statsLoaded && stats ? stats.totalProyek : "…"}
                    proyekBerjalan={statsLoaded && stats ? stats.proyekBerjalan : "…"}
                    {statsLoaded}
                    activeOpdShortName={activeOpd?.shortName ?? null}
                />
            </FloatingPanel>

            <FloatingPanel
                position="top-right"
                title="Filter & Layer"
                icon="🔍"
                testId="dashboard-filter-panel"
            >
                <DashboardFilterPanel
                    bind:visibleStatuses
                    bind:visibleJenis
                    bind:layerGrouping
                />
            </FloatingPanel>

            <FloatingPanel
                position="right-middle"
                title="Zoom Cepat"
                icon="🌍"
                collapsible={false}
                testId="dashboard-zoom-rail"
            >
                <DashboardZoomRail onSetZoomLevel={setZoomLevel} />
            </FloatingPanel>

            <FloatingPanel
                position="bottom-right"
                title="Legenda"
                icon="📋"
                testId="dashboard-legend-floater"
            >
                <DashboardLegendFloater items={legendItems} title="Status Proyek" />
            </FloatingPanel>
        </div>
```

Do not pass `extraClasses="top-12"` or `extraClasses="bottom-12"`; the root variables replace both nudges.

Append this CSS to the dashboard style block and update the root height rules:

```css
    .dashboard-fullmap-layout {
        position: relative;
        height: 100%;
        min-height: 0;
        width: 100%;
        max-width: 100%;
        overflow: clip;
        --dashboard-gutter: clamp(0.5rem, 1.25vw, 2rem);
        --dashboard-middle-lift: clamp(2rem, 5vh, 3rem);
        --dashboard-top-safe: max(
            clamp(3rem, 6vh, 4rem),
            env(safe-area-inset-top, 0px)
        );
        --dashboard-inline-start: max(
            var(--dashboard-gutter),
            env(safe-area-inset-left, 0px)
        );
        --dashboard-inline-end: max(
            var(--dashboard-gutter),
            env(safe-area-inset-right, 0px)
        );
        --dashboard-bottom-safe: max(
            clamp(3rem, 7vh, 4.5rem),
            env(safe-area-inset-bottom, 0px)
        );
    }
    .dashboard-map-wrap {
        position: relative;
        width: 100%;
        height: 100%;
        min-width: 0;
        min-height: 0;
    }
    .dashboard-map-wrap :global([data-fullheight="true"]) {
        min-height: 0 !important;
    }
    .dashboard-panel-layer {
        position: absolute;
        inset: 0;
        z-index: 1000;
        pointer-events: none;
    }
    .dashboard-panel-layer > :global(*) {
        pointer-events: auto;
    }
    @media (max-width: 767px) {
        .dashboard-panel-layer {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            grid-template-rows: auto minmax(0, 1fr) auto;
            grid-template-areas:
                "kpi filter"
                ". ."
                "zoom legend";
            gap: var(--dashboard-gutter);
            padding: var(--dashboard-top-safe) var(--dashboard-inline-end)
                var(--dashboard-gutter) var(--dashboard-inline-start);
            overflow: clip;
        }
        .dashboard-panel-layer > :global(.floating-panel) {
            position: static;
            width: 100%;
            min-width: 0;
            max-width: none;
            transform: none;
        }
        .dashboard-panel-layer > :global(.floating-panel[data-position="top-left"]) {
            grid-area: kpi;
        }
        .dashboard-panel-layer > :global(.floating-panel[data-position="top-right"]) {
            grid-area: filter;
        }
        .dashboard-panel-layer > :global(.floating-panel[data-position="right-middle"]) {
            grid-area: zoom;
        }
        .dashboard-panel-layer > :global(.floating-panel[data-position="bottom-right"]) {
            grid-area: legend;
        }
        .dashboard-panel-layer > :global(.floating-panel[data-position="right-middle"]),
        .dashboard-panel-layer > :global(.floating-panel[data-position="bottom-right"]),
        .dashboard-panel-layer > :global(.floating-panel[data-position="bottom-left"]) {
            align-self: end;
            margin-bottom: var(--dashboard-bottom-safe);
        }
        .dashboard-panel-layer > :global(.floating-panel) :global(.floating-panel-content) {
            max-height: min(30dvh, 15rem);
        }
    }
```
The layer z-index is above MapLibre controls and the fixed draw sheet; its children re-enable pointer events. The dashboard owns the narrow-grid rules because the layer is outside the `FloatingPanel.svelte` component.

Keep the layer wrapper inside `.dashboard-map-wrap` so all positions resolve to the actual map bounds.

- [ ] **Step 3: Constrain the filter select**

Change the grouping select class in `DashboardFilterPanel.svelte` from:

```svelte
class="input w-auto! py-1! text-xs"
```

to:

```svelte
class="input w-full! max-w-full py-1! text-xs"
```

This preserves the existing input styling and prevents the long option from widening a narrow panel.

- [ ] **Step 4: Run the narrow E2E test**

Run:

```bash
npx playwright test tests/e2e/frontend-mvp.spec.ts -g "Dashboard panels reflow"
```

Expected: PASS for document width/height and panel bounds. If the panel content exceeds the grid row, adjust only the panel-local max-height or grid track sizing; do not add document overflow.

- [ ] **Step 5: Commit panel positioning**

```bash
git add frontend/src/lib/components/dashboard/FloatingPanel.svelte frontend/src/lib/components/dashboard/DashboardFilterPanel.svelte frontend/src/routes/dashboard/+page.svelte
git commit -m "fix(dashboard): make legends responsive to map bounds"
```

---

### Task 4: Remove full-height map minimums and verify canvas resizing

**Files:**
- Modify: `frontend/src/lib/components/map/MapContainer.svelte:919-932`.
- Read: `frontend/src/app.css:65-69` to confirm the global MapLibre minimum remains for non-full-height maps.

**Interfaces:**
- Consumes: existing `fullHeight` prop and wrapper `ResizeObserver`.
- Produces: full-height map wrapper and MapLibre element that can shrink to the dashboard's `dvh` height without changing any map API.

- [ ] **Step 1: Replace the full-height minimum rule**

Change the style block from:

```css
    .fullheight {
        height: 100%;
        min-height: 480px;
    }
```

to:

```css
    .fullheight {
        height: 100%;
        min-height: 0;
        min-width: 0;
    }
    .fullheight :global(.maplibregl-map) {
        min-height: 0;
        min-width: 0;
    }
```

Do not remove or alter the global `.maplibregl-map { min-height: 420px; }` rule because non-full-height maps still use it. The scoped full-height selector must win by specificity.
Preserve boundary behavior when a basemap style is replaced. In both the `setBasemap()` and `handleTileError()` `style.load` callbacks, call the existing boundary renderer immediately after `render()`:

```ts
render();
renderSidoarjoBoundary();
```

This restores the boundary layers removed by MapLibre style replacement and retains the current `showSidoarjoBoundary` visibility.

- [ ] **Step 2: Run the short-height E2E test**

Run:

```bash
npx playwright test tests/e2e/frontend-mvp.spec.ts -g "Dashboard map follows a short viewport height"
```

Expected: PASS with a positive map/canvas height no greater than the dashboard root and no document scroll.

- [ ] **Step 3: Run the full dashboard layout regressions**

Run:

```bash
npx playwright test tests/e2e/frontend-mvp.spec.ts -g "Sidebar|Dashboard (screenshot|panels|map follows)"
```

Expected: existing sidebar shown/hidden behavior, 1920px full-bleed bounds, screenshot-size scroll metrics, narrow panel bounds, and short-height canvas assertions all pass.

- [ ] **Step 4: Commit map sizing**

```bash
git add frontend/src/lib/components/map/MapContainer.svelte frontend/tests/e2e/frontend-mvp.spec.ts
git commit -m "fix(map): let full-height canvas follow viewport"
```

---

### Task 5: Run Svelte diagnostics and visual browser verification

**Files:**
- No source changes expected unless a focused diagnostic identifies a regression in the changed components.

**Interfaces:**
- Consumes: the completed shell, panel, and map sizing changes.
- Produces: evidence from the actual Svelte compiler and browser surface at the supplied dimensions and responsive dimensions.

- [ ] **Step 1: Run Svelte diagnostics**

From `frontend`:

```bash
npm run check
```

Expected: exit code 0 with no new Svelte or TypeScript errors. If diagnostics identify a real changed-file error, fix it in the owning task's source and rerun this command.

- [ ] **Step 2: Start the frontend dev server through the project process manager**

Start the existing frontend command with the process tool:

```text
application: npm
args: ["run", "dev"]
cwd: frontend
ready: log matching the Vite local URL and port 5173
```

Open the dashboard in the browser at `1568×758`, log in through the existing mock flow, and inspect:

- no bottom horizontal scrollbar;
- map reaches the viewport edges when the sidebar is hidden;
- KPI, filter, zoom, and legend panels stay inside the map;
- bottom basemap/coordinate controls, draw handle, and notices do not force page scroll.

Repeat at `390×844` and `390×320`; confirm the panels reflow and the map remains visible without document scrolling. Restore the sidebar at `1920×900` and confirm the map returns to the narrower content-column width.

- [ ] **Step 3: Run the frontend unit suite and build**

From `frontend`:

```bash
npm test
npm run build
```

Expected: all Vitest tests pass and Vite completes successfully.

- [ ] **Step 4: Run the repository MVP gate**

From `frontend`:

```bash
npm run verify:mvp
```

Expected: check, unit tests, build, E2E, and accessibility suites complete successfully. If an external prerequisite blocks an existing suite, report the exact command and output rather than claiming the gate passed.

- [ ] **Step 5: Commit any final focused correction**

Only if Task 5 required a source correction:

```bash
git add frontend/src/routes/+layout.svelte frontend/src/lib/components/layout/AppShell.svelte frontend/src/routes/dashboard/+page.svelte frontend/src/lib/components/dashboard/FloatingPanel.svelte frontend/src/lib/components/dashboard/DashboardFilterPanel.svelte frontend/src/lib/components/map/MapContainer.svelte frontend/tests/e2e/frontend-mvp.spec.ts
git commit -m "fix(dashboard): finish responsive map verification corrections"
```

---

## Acceptance Checklist

- Dashboard only: no `100vw` bleed rule remains.
- Sidebar visible/hidden states preserve expected map width behavior.
- At `1568×758`, `document.documentElement.scrollWidth === clientWidth` and `scrollHeight === clientHeight`.
- At narrow and short viewports, all four floating panels remain within dashboard bounds.
- Full-height MapLibre canvas follows wrapper width and height after layout changes.
- Existing dashboard controls and E2E selectors remain present.
- `npm run check`, focused E2E, `npm test`, `npm run build`, and `npm run verify:mvp` have actual recorded results before completion.
