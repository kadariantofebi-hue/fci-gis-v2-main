# Dynamic Dashboard Map Canvas and Legend Layout Design

## Goal

Make the Dashboard Proyek GIS map and every floating legend/control panel size and position from the available viewport at runtime. The dashboard must not create document-level horizontal or vertical scrolling at desktop, tablet, phone, or short-height viewports.

## Context and Root Cause

The dashboard currently lives inside `AppShell.svelte`'s centered `max-w-[1680px]` content wrapper. The map cancels the shell padding with negative margins. When the sidebar is hidden on a viewport wider than the shell cap, the dashboard uses `width: 100vw` plus `calc(50% - 50vw)` margins to escape the cap. That technique includes the browser's scrollbar gutter in the width and can create the horizontal scrollbar visible in the supplied screenshot.

Floating panels also use fixed utility offsets (`top-12` and `bottom-12`) and a fixed panel `max-height: 60vh`. Those offsets do not scale with the map's actual containing block or safe-area controls. `MapContainer.svelte` already observes its wrapper and coalesces `map.resize()` through `requestAnimationFrame`, but full-height mode still imposes a `480px` minimum, which can exceed short viewport heights.

The defect is layout sizing, not MapLibre projection or layer rendering. The existing resize observer should remain the source of truth for canvas synchronization.

## Design Decisions

### 1. Route-scoped full-width content boundary

Add a generic `fullWidth` prop to `AppShell.svelte` and enable it only when the active route is `/dashboard` from `routes/+layout.svelte`.

When `fullWidth` is true, the shell's inner content wrapper has no `1680px` max-width. The dashboard's existing negative margins then resolve against the real content column:

- sidebar visible: map fills the remaining flex column;
- sidebar hidden: map fills the client viewport;
- no `100vw` width or viewport-centering margin is required;
- non-dashboard routes retain the existing centered `1680px` cap.

Remove the dashboard `viewport-bleed` class and its `100vw` CSS rule. The sidebar store API and sidebar transition remain unchanged.

### 2. Viewport-sized dashboard root

Keep `.dashboard-fullmap-layout` as the positioning and clipping boundary. The route-scoped full-width `AppShell` makes its main region the remaining flex height below the actual Navbar, so the root can use the containing block without guessing a fixed Navbar height. Update it to:

- `height: 100%` within the shell's `min-h-0 flex-1` main region;
- `min-height: 0`;
- `max-width: 100%`;
- `overflow: clip` (with the existing behavior preserved where `clip` is unavailable through the normal CSS fallback behavior).

Define responsive custom properties on the dashboard root:

- `--dashboard-gutter`: a `clamp()` value with safe-area-aware inline insets;
- `--dashboard-top-safe`: a `clamp()` inset that clears MapContainer's top-left layer count and fullscreen controls;
- `--dashboard-bottom-safe`: a `clamp()` value that clears the basemap control, coordinate display, draw handle, and bottom map notices.

The map wrapper remains `position: relative`, `width: 100%`, and `height: 100%`.

### 3. Dynamic floating-panel positions

Keep `FloatingPanel.svelte`'s public props, `data-position` values, test IDs, z-index, collapse state, and slot contract.

Replace fixed position utility dependence with low-specificity selectors based on `data-position` and the dashboard custom properties:

- `top-left`: top-safe + inline-start gutter, so it clears MapContainer's top-left controls;
- `top-right`: block-start + inline-end gutter;
- `top-center`: block-start gutter and centered inline position;
- `right-middle`: vertical center lifted by `--dashboard-middle-lift` so it clears the bottom-right legend;
- `bottom-right`: block-end bottom-safe inset + inline-end gutter;
- `bottom-left`: block-end bottom-safe inset + inline-start gutter.

Position selectors use low specificity so the documented `extraClasses` utility nudges remain effective for other callers. Panel width must be bounded by its containing block: `min(420px, 100% minus two gutters)`. Panel content retains an internal `overflow-y: auto` boundary, with a max height based on `dvh` and the panel's containing block rather than creating document scrolling. `min-width: 0` is applied so labels and selects can shrink.

Remove the dashboard-specific `top-12` and `bottom-12` `extraClasses`; the shared safe-area tokens become the only dashboard position nudge. Preserve `extraClasses` for other callers.

### 4. Responsive panel reflow

Wrap the four dashboard `FloatingPanel` instances in a `.dashboard-panel-layer` positioned over the map. Desktop and tablet widths preserve edge-docked positions.

At narrow widths, the layer becomes a two-column grid with bounded gaps and padding. Its block-start padding uses `--dashboard-top-safe` so the first row still clears MapContainer's top-left controls:

- top-left KPI panel: first column, first row;
- top-right filter panel: second column, first row;
- right-middle zoom panel: first column, bottom row;
- bottom-right legend panel: second column, bottom row.

The map remains a full-size background layer. The responsive panel layer clips to the map wrapper and has no document scroll. Individual panel contents may scroll internally when necessary for accessibility and to keep all controls reachable.

`DashboardFilterPanel.svelte`'s grouping select becomes `width: 100%` and `max-width: 100%` at narrow widths so the long infrastructure-grouping option cannot widen its panel.

### 5. Dynamic MapLibre canvas resolution

Keep `MapContainer.svelte`'s existing full-height `ResizeObserver`, animation-frame resize coalescing, window resize listener, cleanup, and public API unchanged.

Remove the full-height-only `min-height: 480px` constraint and override the global MapLibre minimum height for full-height mode. The wrapper and MapLibre element must be allowed to shrink to the dashboard root's `dvh` height. MapLibre continues to receive `map.resize()` whenever the wrapper changes because of:

- sidebar collapse/restore;
- browser resize;
- orientation change;
- viewport height changes;
- responsive panel layout changes.

No manual canvas width/height, device-pixel-ratio workaround, new event bus, or map API is required.

## Data Flow

```text
route = /dashboard
        ↓
AppShell fullWidth=true removes only the dashboard content cap
        ↓
dashboard root sizes from the client content column and dvh
        ↓
CSS custom properties position panels against the actual map wrapper
        ↓
MapContainer ResizeObserver observes wrapper width/height changes
        ↓
requestAnimationFrame coalesces map.resize()
        ↓
MapLibre canvas matches the visible map bounds
```

## Interfaces

- `AppShell.svelte`: add one optional generic `fullWidth` prop; default `false`.
- `routes/+layout.svelte`: pass `fullWidth` only for `/dashboard`.
- `routes/dashboard/+page.svelte`: remove sidebar-specific bleed state and add the panel layer/custom properties.
- `FloatingPanel.svelte`: keep all existing exported props and test IDs; use `data-position` CSS for dynamic offsets.
- `DashboardFilterPanel.svelte`: retain bindings and test IDs; constrain the grouping select on narrow widths.
- `MapContainer.svelte`: retain all props and map lifecycle; only remove the full-height minimum constraints.

## Verification Strategy

Add or extend browser coverage to assert:

1. At `1920×900`, the map fills the content column with the sidebar visible and reaches the viewport edges after hiding the sidebar.
2. At `1568×758`, the supplied screenshot dimensions produce no horizontal or vertical document scroll (`scrollWidth === clientWidth`, `scrollHeight === clientHeight`).
3. At a narrow phone viewport, the responsive panel layer stays within the map bounds and all panel controls remain reachable without document scrolling.
4. At a short-height viewport, the map wrapper and canvas remain inside the dashboard root; the full-height minimum does not force overflow.
5. The MapLibre canvas width and height track the dashboard map wrapper after sidebar transition and browser resize.
6. Existing dashboard controls, basemap selection, legend test IDs, zoom rail, drawing sheet, popup, and boundary behavior remain functional.

Run `npm run check`, focused dashboard/sidebar Playwright coverage, `npm test`, `npm run build`, and finally `npm run verify:mvp`. Perform a browser visual check at the supplied viewport and at a narrow viewport before claiming completion.

## Non-Goals

- No change to MapLibre center, zoom, layers, popups, drawing, basemap providers, or geometry behavior.
- No global removal of the `1680px` shell cap for non-dashboard routes.
- No redesign of sidebar navigation or dashboard content.
- No suppression of overflow as a substitute for fixing the containing-block dimensions.
- No new global store, event bus, or canvas-resolution API.
