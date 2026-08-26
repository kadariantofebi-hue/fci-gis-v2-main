# Rencana Refactor Dashboard: Full Map Layout

**Tanggal**: 2026-06-21  
**Tujuan**: Mengubah halaman Dashboard dari layout card-based menjadi full-screen map seperti referensi SIBIMASAKTI Sidoarjo  
**Referensi**: https://sibimasakti.sidoarjokab.go.id/maps/wilayah

---

## 1. Analisis Layout Referensi (SELESAI ✓)

### Karakteristik Utama Layout Referensi:
- **Peta mengambil 85-90% viewport** (minus header & footer)
- **Fixed header** (~60px) untuk navigasi persistent
- **Floating controls** untuk interaksi peta (9 tombol kontrol)
- **Minimalis UI** untuk maksimalkan area visualisasi
- **Footer informatif** untuk kontak dan kredensial

### Struktur Visual:
```
┌─────────────────────────────────────────┐
│  HEADER/NAVBAR (Fixed Top, ~60px)      │
├─────────────────────────────────────────┤
│         AREA PETA UTAMA (Full)          │
│  [Floating Controls]                    │
│  • Zoom, Layer, Search, Legend, etc     │
└─────────────────────────────────────────┘
```

---

## 2. Identifikasi Komponen Dashboard Saat Ini yang Perlu Direfactor

### 2.1 Struktur Layout Saat Ini

**File**: `frontend/src/routes/dashboard/+page.svelte`

#### Komponen Utama yang Ada:
1. **Header Section** (baris 94-107)
   - Kicker text: "Pusat Kendali SIMANTA · Single active OPD"
   - OPD name display
   - Page title: "Dashboard Proyek GIS"
   - Basemap selector dropdown
   - **Status**: ❌ Terlalu besar, perlu dikompakkan

2. **KPI Cards Section** (baris 109-121)
   - Grid 2 kolom untuk KPI cards
   - Total Proyek & Proyek Berjalan
   - **Status**: ❌ Mengambil ruang vertikal, perlu dijadikan floating overlay

3. **Map Section** (baris 123-177)
   - Card wrapper dengan padding
   - Map header dengan title & zoom controls
   - Filter controls (status & jenis) dalam border section
   - Layer grouping selector
   - Simulation checkbox
   - MapContainer component
   - **Status**: ⚠️ Perlu diubah menjadi full-height tanpa card wrapper

4. **Legend Section** (baris 179-181)
   - Standalone legend di bawah map
   - **Status**: ❌ Perlu dijadikan floating panel

### 2.2 Elemen yang Mengambil Ruang Vertikal (Perlu Direfactor)

| Elemen | Tinggi Estimasi | Masalah | Solusi |
|--------|----------------|---------|--------|
| Header section dengan title & basemap | ~100-120px | Terlalu besar untuk full-map layout | Kompakkan menjadi ~50-60px navbar |
| KPI Cards grid | ~120-150px | Mengambil ruang di atas peta | Jadikan floating overlay/sidebar collapsible |
| Map card padding & borders | ~40px total | Mengurangi area peta | Hapus card wrapper, gunakan full viewport |
| Map header dengan title | ~50px | Redundan dengan navbar | Integrasikan ke navbar atau hapus |
| Filter controls section | ~80-100px | Mengambil ruang di dalam card | Jadikan floating panel |
| Legend section di bawah | ~80-100px | Terpisah dari peta | Jadikan floating panel overlay |

**Total ruang yang bisa dihemat**: ~470-560px → dapat dialokasikan untuk peta!

### 2.3 Komponen yang Perlu Dipertahankan (dengan Modifikasi)

✅ **MapContainer.svelte** - Core component, perlu adjustment:
- Hapus height constraint dari parent
- Gunakan `h-screen` atau `calc(100vh - navbar_height)`
- Pastikan responsive untuk mobile

✅ **Basemap selector** - Pindahkan ke navbar atau floating control

✅ **Zoom level buttons** - Pertahankan sebagai floating control

✅ **Filter controls** (status & jenis) - Jadikan floating panel collapsible

✅ **Legend** - Jadikan floating panel di pojok

✅ **KPI Cards** - Jadikan floating overlay atau sidebar collapsible

---

## 3. Desain Struktur Layout Baru

### 3.1 Layout Hierarchy Baru

```
<div class="dashboard-container"> <!-- Full viewport -->
  
  <!-- 1. Compact Navbar (Fixed Top, ~50-60px) -->
  <nav class="dashboard-navbar">
    <div class="navbar-left">
      <span class="opd-badge">OPD Name</span>
      <h1 class="navbar-title">Dashboard Proyek GIS</h1>
    </div>
    <div class="navbar-right">
      <select>Basemap</select>
      <button>User Menu</button>
    </div>
  </nav>

  <!-- 2. Full-Height Map (calc(100vh - navbar_height)) -->
  <div class="map-wrapper">
    <MapContainer ... />
    
    <!-- 3. Floating Panels (Overlay pada Map) -->
    
    <!-- 3a. KPI Panel (Top-Left, Collapsible) -->
    <div class="floating-panel kpi-panel">
      <button class="panel-toggle">📊</button>
      <div class="panel-content">
        <KpiCard ... />
        <KpiCard ... />
      </div>
    </div>
    
    <!-- 3b. Filter Panel (Top-Right, Collapsible) -->
    <div class="floating-panel filter-panel">
      <button class="panel-toggle">🔍</button>
      <div class="panel-content">
        <!-- Status checkboxes -->
        <!-- Jenis checkboxes -->
        <!-- Layer grouping -->
      </div>
    </div>
    
    <!-- 3c. Zoom Controls (Right-Middle) -->
    <div class="floating-panel zoom-panel">
      <button>Indonesia</button>
      <button>Jawa Timur</button>
      <button>Sidoarjo</button>
    </div>
    
    <!-- 3d. Legend Panel (Bottom-Right, Collapsible) -->
    <div class="floating-panel legend-panel">
      <button class="panel-toggle">📋</button>
      <div class="panel-content">
        <Legend ... />
      </div>
    </div>
    
  </div>
  
</div>
```

### 3.2 Positioning Strategy

| Panel | Position | Justifikasi |
|-------|----------|-------------|
| **Navbar** | `fixed top-0 left-0 right-0 z-50` | Persistent navigation, always accessible |
| **KPI Panel** | `absolute top-4 left-4 z-40` | Quick stats visibility, collapsible untuk space |
| **Filter Panel** | `absolute top-4 right-4 z-40` | Primary interaction, mudah dijangkau |
| **Zoom Controls** | `absolute right-4 top-1/2 -translate-y-1/2 z-30` | Standard map control position |
| **Legend Panel** | `absolute bottom-4 right-4 z-40` | Standard legend position, tidak menghalangi |

### 3.3 Responsive Behavior

**Desktop (≥1024px)**:
- Semua panels visible by default
- KPI panel expanded
- Filter panel expanded

**Tablet (768px - 1023px)**:
- KPI panel collapsed by default
- Filter panel collapsed by default
- Legend panel collapsed by default

**Mobile (<768px)**:
- Navbar dengan hamburger menu
- Semua panels collapsed by default
- Panels menjadi full-width drawer dari bottom

---

## 4. Rancangan Floating Panels

### 4.1 Base Panel Component Structure

```svelte
<!-- FloatingPanel.svelte -->
<script lang="ts">
  export let position: 'top-left' | 'top-right' | 'bottom-right' | 'right-middle';
  export let title: string;
  export let icon: string;
  export let collapsible = true;
  export let defaultExpanded = true;
  
  let expanded = $state(defaultExpanded);
  
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
    'right-middle': 'right-4 top-1/2 -translate-y-1/2'
  };
</script>

<div class="floating-panel {positionClasses[position]}">
  <div class="panel-header">
    <span class="panel-icon">{icon}</span>
    <span class="panel-title">{title}</span>
    {#if collapsible}
      <button class="panel-toggle" on:click={() => expanded = !expanded}>
        {expanded ? '−' : '+'}
      </button>
    {/if}
  </div>
  
  {#if expanded}
    <div class="panel-content">
      <slot />
    </div>
  {/if}
</div>

<style>
  .floating-panel {
    @apply absolute z-40 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200;
    @apply max-w-sm; /* Prevent panels from being too wide */
  }
  
  .panel-header {
    @apply flex items-center gap-2 px-3 py-2 border-b border-slate-200;
    @apply text-sm font-semibold text-slate-700;
  }
  
  .panel-content {
    @apply p-3 max-h-[60vh] overflow-y-auto;
  }
  
  .panel-toggle {
    @apply ml-auto w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100;
  }
</style>
```

### 4.2 Panel Specifications

#### A. KPI Panel (Top-Left)
```svelte
<FloatingPanel position="top-left" title="Statistik" icon="📊" collapsible={true}>
  <div class="space-y-2">
    <div class="kpi-compact">
      <span class="kpi-label">Total Proyek</span>
      <span class="kpi-value">{stats?.totalProyek ?? '…'}</span>
    </div>
    <div class="kpi-compact">
      <span class="kpi-label">Proyek Berjalan</span>
      <span class="kpi-value">{stats?.proyekBerjalan ?? '…'}</span>
    </div>
  </div>
</FloatingPanel>
```

**Styling**:
- Compact cards (tidak perlu icon besar)
- Horizontal layout untuk space efficiency
- Max-width: 280px

#### B. Filter Panel (Top-Right)
```svelte
<FloatingPanel position="top-right" title="Filter & Layer" icon="🔍" collapsible={true}>
  <div class="space-y-3">
    <!-- Status filters -->
    <div>
      <div class="filter-section-title">Status Proyek</div>
      <div class="flex flex-wrap gap-1.5">
        {#each PROJECT_STATUS_GROUPS as group}
          <label class="filter-chip">
            <input type="checkbox" bind:group={visibleStatuses} value={group} />
            <span>{statusLabels[group]}</span>
          </label>
        {/each}
      </div>
    </div>
    
    <!-- Jenis filters -->
    <div>
      <div class="filter-section-title">Jenis Infrastruktur</div>
      <div class="flex flex-wrap gap-1.5">
        {#each jenisOptions as jenis}
          <label class="filter-chip">
            <input type="checkbox" bind:group={visibleJenis} value={jenis} />
            <span>{jenisLabels[jenis]}</span>
          </label>
        {/each}
      </div>
    </div>
    
    <!-- Layer grouping -->
    <div>
      <div class="filter-section-title">Grouping</div>
      <select bind:value={layerGrouping} class="w-full">
        <option value="status">By Status</option>
        <option value="jenis">By Jenis</option>
      </select>
    </div>
  </div>
</FloatingPanel>
```

**Styling**:
- Max-width: 320px
- Scrollable jika konten terlalu panjang
- Compact checkboxes dengan label singkat

#### C. Zoom Controls (Right-Middle)
```svelte
<FloatingPanel position="right-middle" title="Zoom" icon="🌍" collapsible={false}>
  <div class="flex flex-col gap-1">
    {#each zoomLevels as level}
      <button 
        class="zoom-button"
        on:click={() => setZoomLevel(level)}
      >
        <svelte:component this={level.icon} size={16} />
        <span>{level.label}</span>
      </button>
    {/each}
  </div>
</FloatingPanel>
```

**Styling**:
- Vertical stack
- Icon + text untuk clarity
- Max-width: 200px

#### D. Legend Panel (Bottom-Right)
```svelte
<FloatingPanel position="bottom-right" title="Legenda" icon="📋" collapsible={true}>
  <Legend items={legendItems} compact={true} />
</FloatingPanel>
```

**Styling**:
- Max-width: 280px
- Compact legend items
- Color swatches dengan label singkat

---

## 5. Compact Header/Navbar Design

### 5.1 Navbar Structure

```svelte
<nav class="dashboard-navbar">
  <div class="navbar-container">
    <!-- Left section -->
    <div class="navbar-left">
      <span class="opd-badge">{activeOpd?.shortName ?? 'Loading'}</span>
      <h1 class="navbar-title">Dashboard Proyek GIS</h1>
    </div>
    
    <!-- Right section -->
    <div class="navbar-right">
      <!-- Basemap selector -->
      <div class="navbar-control">
        <label for="basemap-select" class="sr-only">Pilih Basemap</label>
        <select 
          id="basemap-select"
          bind:value={basemap} 
          on:change={persistDashboardPreferences}
          class="basemap-select"
        >
          {#each getActiveBasemaps() as provider}
            <option value={provider.key}>{provider.name}</option>
          {/each}
        </select>
      </div>
      
      <!-- User menu (future) -->
      <button class="navbar-user-menu" aria-label="User menu">
        <UserCircle size={20} />
      </button>
    </div>
  </div>
</nav>
```

### 5.2 Navbar Styling

```css
.dashboard-navbar {
  @apply fixed top-0 left-0 right-0 z-50;
  @apply bg-white border-b border-slate-200;
  @apply shadow-sm;
  height: 56px; /* Fixed height untuk consistency */
}

.navbar-container {
  @apply h-full px-4 flex items-center justify-between;
  @apply max-w-screen-2xl mx-auto;
}

.navbar-left {
  @apply flex items-center gap-3;
}

.opd-badge {
  @apply px-2 py-1 rounded-md bg-emerald-100 text-emerald-800;
  @apply text-xs font-bold uppercase tracking-wide;
}

.navbar-title {
  @apply text-base font-bold text-slate-800;
  @apply hidden sm:block; /* Hide on mobile */
}

.navbar-right {
  @apply flex items-center gap-3;
}

.basemap-select {
  @apply px-2 py-1 rounded-md border border-slate-300;
  @apply text-xs font-medium bg-white;
  @apply focus:outline-none focus:ring-2 focus:ring-emerald-500;
}

.navbar-user-menu {
  @apply p-1.5 rounded-md hover:bg-slate-100;
  @apply text-slate-600 hover:text-slate-900;
}
```

### 5.3 Responsive Navbar

**Mobile (<640px)**:
- Hide navbar title
- Compact basemap selector
- Hamburger menu untuk additional controls

**Tablet (640px - 1023px)**:
- Show navbar title
- Full basemap selector

**Desktop (≥1024px)**:
- Full layout dengan semua controls

---

## 6. Perubahan CSS/Tailwind untuk Full Viewport Layout

### 6.1 Root Layout Changes

**File**: `frontend/src/routes/dashboard/+page.svelte`

#### Before (Current):
```svelte
<div class="space-y-4">
  <section>...</section>
  <section>...</section>
  <section class="card">...</section>
</div>
```

#### After (New):
```svelte
<div class="dashboard-full-layout">
  <nav class="dashboard-navbar">...</nav>
  <div class="map-container">
    <MapContainer ... />
    <!-- Floating panels -->
  </div>
</div>
```

### 6.2 CSS Classes Baru

```css
/* Dashboard full layout */
.dashboard-full-layout {
  @apply relative w-full h-screen overflow-hidden;
}

/* Map container - full height minus navbar */
.map-container {
  @apply relative w-full;
  height: calc(100vh - 56px); /* 56px = navbar height */
  margin-top: 56px; /* Offset untuk fixed navbar */
}

/* Floating panel base */
.floating-panel {
  @apply absolute z-40;
  @apply bg-white/95 backdrop-blur-sm;
  @apply rounded-lg shadow-lg border border-slate-200;
  @apply transition-all duration-200;
}

/* Panel collapsed state */
.floating-panel.collapsed {
  @apply w-12 h-12;
}

.floating-panel.collapsed .panel-content {
  @apply hidden;
}

/* Filter chip (untuk checkboxes) */
.filter-chip {
  @apply inline-flex items-center gap-1.5;
  @apply px-2 py-1 rounded-full;
  @apply border border-slate-200 bg-white;
  @apply text-xs font-medium text-slate-700;
  @apply cursor-pointer transition;
  @apply hover:border-slate-300 hover:bg-slate-50;
}

.filter-chip input[type="checkbox"] {
  @apply w-3 h-3 accent-emerald-600;
}

/* KPI compact */
.kpi-compact {
  @apply flex items-center justify-between;
  @apply px-3 py-2 rounded-md bg-slate-50;
  @apply border border-slate-200;
}

.kpi-compact .kpi-label {
  @apply text-xs font-medium text-slate-600;
}

.kpi-compact .kpi-value {
  @apply text-lg font-bold text-slate-900;
}

/* Zoom button */
.zoom-button {
  @apply flex items-center gap-2 px-3 py-2;
  @apply rounded-md bg-white border border-slate-200;
  @apply text-sm font-medium text-slate-700;
  @apply hover:bg-slate-50 hover:border-slate-300;
  @apply transition-colors;
}
```

### 6.3 Responsive Utilities

```css
/* Mobile adjustments */
@media (max-width: 767px) {
  .floating-panel {
    @apply max-w-[calc(100vw-2rem)]; /* Prevent overflow */
  }
  
  .floating-panel.top-left,
  .floating-panel.top-right {
    @apply top-2 left-2 right-2; /* Full width on mobile */
  }
  
  .floating-panel.bottom-right {
    @apply bottom-2 left-2 right-2;
  }
}

/* Tablet adjustments */
@media (min-width: 768px) and (max-width: 1023px) {
  .floating-panel {
    @apply max-w-xs;
  }
}
```

---

## 7. Perubahan pada MapContainer.svelte

### 7.1 Props yang Perlu Ditambahkan

```typescript
export let fullHeight = false; // New prop untuk full-height mode
```

### 7.2 Height Calculation

#### Before:
```svelte
<div class="map-wrapper" style="height: 600px;">
  <div bind:this={mapElement} class="map-element"></div>
</div>
```

#### After:
```svelte
<div 
  class="map-wrapper" 
  class:full-height={fullHeight}
  style={fullHeight ? 'height: 100%;' : 'height: 600px;'}
>
  <div bind:this={mapElement} class="map-element"></div>
</div>
```

### 7.3 CSS Updates

```css
.map-wrapper.full-height {
  @apply w-full h-full;
}

.map-wrapper.full-height .map-element {
  @apply w-full h-full;
}
```

### 7.4 Leaflet Initialization

Pastikan `map.invalidateSize()` dipanggil setelah resize:

```typescript
onMount(() => {
  // ... existing code ...
  
  if (fullHeight) {
    // Listen for window resize
    const resizeObserver = new ResizeObserver(() => {
      map?.invalidateSize();
    });
    resizeObserver.observe(mapElement);
    
    return () => resizeObserver.disconnect();
  }
});
```

---

## 8. Breaking Changes & Migration Path

### 8.1 Breaking Changes

| Change | Impact | Migration |
|--------|--------|-----------|
| Layout structure berubah total | High | Perlu update semua references ke dashboard layout |
| KPI Cards tidak lagi standalone section | Medium | Komponen tetap sama, hanya positioning berubah |
| Filter controls menjadi floating | Medium | Logic tetap sama, UI berubah |
| Legend menjadi floating | Low | Komponen tetap sama, hanya positioning berubah |
| MapContainer perlu prop `fullHeight` | Low | Backward compatible dengan default `false` |

### 8.2 Migration Steps

1. **Backup current dashboard**:
   ```bash
   cp frontend/src/routes/dashboard/+page.svelte frontend/src/routes/dashboard/+page.svelte.backup
   ```

2. **Create FloatingPanel component**:
   - Buat `frontend/src/lib/components/dashboard/FloatingPanel.svelte`
   - Implement base panel structure

3. **Update MapContainer**:
   - Add `fullHeight` prop
   - Update CSS untuk full-height support
   - Test resize behavior

4. **Refactor dashboard layout**:
   - Remove card wrappers
   - Implement navbar
   - Convert sections to floating panels

5. **Test responsive behavior**:
   - Desktop: All panels visible
   - Tablet: Panels collapsible
   - Mobile: Drawer-style panels

6. **Update E2E tests**:
   - Update selectors untuk new layout
   - Test panel collapse/expand
   - Test responsive breakpoints

### 8.3 Rollback Plan

Jika ada masalah:
1. Restore backup: `mv +page.svelte.backup +page.svelte`
2. Revert MapContainer changes
3. Remove FloatingPanel component

---

## 9. Checklist Implementasi untuk Mode 'code'

### Phase 1: Foundation (Prioritas Tinggi)
- [ ] Buat `FloatingPanel.svelte` component
- [ ] Update `MapContainer.svelte` dengan prop `fullHeight`
- [ ] Buat CSS utilities untuk floating panels
- [ ] Implement compact navbar structure

### Phase 2: Layout Refactor (Prioritas Tinggi)
- [ ] Refactor `dashboard/+page.svelte` layout structure
- [ ] Remove card wrappers dan spacing utilities
- [ ] Implement full-height map container
- [ ] Add navbar dengan OPD badge dan basemap selector

### Phase 3: Floating Panels (Prioritas Tinggi)
- [ ] Convert KPI section ke floating panel (top-left)
- [ ] Convert filter controls ke floating panel (top-right)
- [ ] Convert zoom controls ke floating panel (right-middle)
- [ ] Convert legend ke floating panel (bottom-right)

### Phase 4: Interactivity (Prioritas Medium)
- [ ] Implement panel collapse/expand functionality
- [ ] Add panel toggle buttons
- [ ] Implement panel state persistence (localStorage)
- [ ] Add smooth transitions untuk panel animations

### Phase 5: Responsive (Prioritas Medium)
- [ ] Implement mobile responsive behavior
- [ ] Add tablet breakpoint adjustments
- [ ] Test panel positioning pada berbagai screen sizes
- [ ] Implement drawer-style panels untuk mobile

### Phase 6: Polish (Prioritas Low)
- [ ] Add backdrop blur effects
- [ ] Implement panel drag-and-drop (optional)
- [ ] Add keyboard shortcuts untuk panel toggle
- [ ] Add tooltips untuk collapsed panels

### Phase 7: Testing (Prioritas Tinggi)
- [ ] Update E2E tests untuk new layout
- [ ] Test panel collapse/expand
- [ ] Test responsive breakpoints
- [ ] Test map resize behavior
- [ ] Test basemap switching
- [ ] Test filter functionality
- [ ] Accessibility testing (keyboard navigation, screen readers)

### Phase 8: Documentation (Prioritas Medium)
- [ ] Update component documentation
- [ ] Add migration guide untuk developers
- [ ] Update user documentation/help text
- [ ] Add screenshots untuk new layout

---

## 10. Estimasi Effort

| Phase | Tasks | Estimasi Waktu | Complexity |
|-------|-------|----------------|------------|
| Phase 1: Foundation | 4 tasks | 2-3 jam | Medium |
| Phase 2: Layout Refactor | 4 tasks | 3-4 jam | High |
| Phase 3: Floating Panels | 4 tasks | 4-5 jam | Medium |
| Phase 4: Interactivity | 4 tasks | 2-3 jam | Medium |
| Phase 5: Responsive | 4 tasks | 3-4 jam | High |
| Phase 6: Polish | 4 tasks | 2-3 jam | Low |
| Phase 7: Testing | 7 tasks | 4-5 jam | High |
| Phase 8: Documentation | 4 tasks | 2-3 jam | Low |

**Total Estimasi**: 22-30 jam kerja

**Rekomendasi Sprint**: 3-4 hari kerja (dengan buffer untuk bug fixes)

---

## 11. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Map tidak resize dengan benar | High | Medium | Implement ResizeObserver, test extensively |
| Floating panels overlap pada mobile | Medium | High | Implement responsive positioning, test breakpoints |
| Performance degradation dengan banyak panels | Medium | Low | Use CSS transforms, lazy render panel content |
| Accessibility issues dengan floating UI | High | Medium | Implement proper ARIA labels, keyboard navigation |
| User confusion dengan new layout | Medium | Medium | Add onboarding tooltips, user guide |

---

## 12. Success Criteria

✅ **Layout**:
- [ ] Peta mengambil minimal 85% viewport height
- [ ] Navbar fixed dengan height ≤60px
- [ ] Semua panels floating dengan proper positioning

✅ **Functionality**:
- [ ] Semua fitur existing tetap berfungsi (filter, zoom, legend, KPI)
- [ ] Panel collapse/expand bekerja smooth
- [ ] Basemap switching tetap berfungsi
- [ ] Map resize otomatis saat window resize

✅ **Responsive**:
- [ ] Desktop: All panels visible by default
- [ ] Tablet: Panels collapsible
- [ ] Mobile: Drawer-style panels, tidak overlap

✅ **Performance**:
- [ ] No layout shift saat panel toggle
- [ ] Smooth animations (60fps)
- [ ] Map rendering tidak terpengaruh

✅ **Accessibility**:
- [ ] Keyboard navigation untuk semua panels
- [ ] Screen reader friendly
- [ ] Focus management yang proper

✅ **Testing**:
- [ ] E2E tests pass dengan new layout
- [ ] Visual regression tests pass
- [ ] Accessibility audit score ≥95

---

## 13. Next Steps

1. **Review plan ini dengan stakeholder/team**
2. **Approval untuk proceed ke implementation**
3. **Switch ke mode 'code' untuk mulai implementasi**
4. **Follow checklist Phase 1-8 secara sequential**
5. **Regular testing setelah setiap phase**

---

**Status**: ✅ Planning Complete - Ready for Implementation  
**Mode Selanjutnya**: `code` atau `advanced`  
**Estimasi Total**: 22-30 jam kerja (3-4 hari sprint)
