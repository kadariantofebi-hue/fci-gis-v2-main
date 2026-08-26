<script lang="ts">
  import type { Geometry } from '$shared/geojson';
  import type { DrawMode } from '$shared/enums';
  import {
    PenTool,
    ChevronUp,
    MapPin,
    Spline,
    Shapes,
    RotateCcw,
    Plus,
    X,
    MousePointerClick,
  } from 'lucide-svelte';

  // Svelte 5 runes: callback props replace createEventDispatcher.
  interface Props {
    mode?: DrawMode;
    geometry: Geometry | null;
    statusText: string;
    editMode: 'view' | 'draw';
    onModeChange: (mode: DrawMode) => void;
    onReset: () => void;
    onAddProject: (geometry: Geometry) => void;
    onEditModeChange: (editMode: 'view' | 'draw') => void;
  }
  let {
    mode = $bindable('polygon'),
    geometry,
    statusText,
    editMode,
    onModeChange,
    onReset,
    onAddProject,
    onEditModeChange,
  }: Props = $props();

  const MODES: Array<{
    key: DrawMode;
    label: string;
    icon: typeof MapPin;
    testId: string;
  }> = [
    {
      key: 'point',
      label: 'Titik',
      icon: MapPin,
      testId: 'dashboard-draw-sheet-mode-point',
    },
    {
      key: 'line',
      label: 'Garis',
      icon: Spline,
      testId: 'dashboard-draw-sheet-mode-line',
    },
    {
      key: 'polygon',
      label: 'Area',
      icon: Shapes,
      testId: 'dashboard-draw-sheet-mode-polygon',
    },
  ];

  let isOpen = $state(false);

  function toggleOpen(): void {
    isOpen = !isOpen;
    onEditModeChange(isOpen ? 'draw' : 'view');
  }

  function selectMode(next: DrawMode): void {
    mode = next;
    onModeChange(next);
  }

  function handleReset(): void {
    onReset();
  }

  function handleAdd(): void {
    if (geometry) onAddProject(geometry);
  }
</script>

<!-- Floating Digitasi Map Action Pill (FAB) -->
<button
  type="button"
  class="dashboard-draw-sheet-handle"
  class:open={isOpen}
  aria-expanded={isOpen}
  aria-controls="dashboard-draw-sheet-content"
  data-testid="dashboard-draw-sheet-handle"
  onclick={toggleOpen}
  title="Digitasi Peta (Titik, Garis, Area)"
>
  <!-- GIS Pen/Vector Icon Badge with ambient glow -->
  <span class="handle-icon-badge" aria-hidden="true">
    <PenTool size={15} class="handle-pen-icon" />
  </span>

  <!-- Label -->
  <span class="label">Digitasi</span>

  <!-- Chevron expander -->
  <span class="handle-chevron" aria-hidden="true">
    <ChevronUp size={15} />
  </span>
</button>

{#if isOpen}
  <div
    id="dashboard-draw-sheet-content"
    class="dashboard-draw-sheet"
    data-testid="dashboard-draw-sheet"
    role="region"
    aria-label="Digitasi Cepat"
  >
    <header class="sheet-header">
      <div class="sheet-title-group">
        <span class="sheet-icon-badge" aria-hidden="true">
          <PenTool size={13} />
        </span>
        <strong class="text-xs font-bold text-slate-800">Digitasi Cepat</strong>
      </div>
      <button
        type="button"
        class="close-btn"
        aria-label="Tutup drawer"
        data-testid="dashboard-draw-sheet-close"
        onclick={toggleOpen}
      >
        <X size={15} />
      </button>
    </header>

    <!-- Segmented mode selector -->
    <fieldset class="modes-segmented">
      <legend class="sr-only">Mode digitasi</legend>
      {#each MODES as m (m.key)}
        {@const Icon = m.icon}
        {@const isSelected = mode === m.key}
        <label class="mode-tab" class:active={isSelected}>
          <input
            type="radio"
            name="dashboard-draw-mode"
            value={m.key}
            checked={isSelected}
            onchange={() => selectMode(m.key)}
            data-testid={m.testId}
            class="mode-radio-input"
          />
          <Icon size={13} class="mode-icon" />
          <span class="mode-label">{m.label}</span>
        </label>
      {/each}
    </fieldset>

    <!-- Dynamic status bar -->
    <div class="status-card" aria-live="polite" data-testid="dashboard-draw-sheet-status">
      <MousePointerClick size={13} class="status-icon shrink-0" />
      <span class="status-text">{statusText}</span>
    </div>

    <!-- Actions footer -->
    <div class="actions">
      <button
        type="button"
        class="btn-reset"
        onclick={handleReset}
        data-testid="dashboard-draw-sheet-reset"
      >
        <RotateCcw size={12} />
        <span>Reset</span>
      </button>
      <button
        type="button"
        class="btn-primary"
        onclick={handleAdd}
        disabled={!geometry}
        data-testid="dashboard-draw-sheet-add-project"
      >
        <Plus size={14} />
        <span>Tambah Proyek</span>
      </button>
    </div>
  </div>
{/if}

<style>
  /* ==========================================================================
     FLOATING DIGITASI HANDLE (PILL FAB) & DRAWER POSITIONING
     ========================================================================== */
  .dashboard-draw-sheet-handle {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    height: 40px;
    padding: 0 14px 0 8px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.94) 100%);
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
    color: #ffffff;
    border: 1px solid rgba(56, 189, 248, 0.45);
    border-radius: 9999px;
    box-shadow:
      0 10px 25px -3px rgba(15, 23, 42, 0.6),
      0 4px 14px -2px rgba(37, 99, 235, 0.35),
      inset 0 1px 1px 0 rgba(255, 255, 255, 0.2);
    cursor: pointer;
    user-select: none;
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease;
  }


  .dashboard-draw-sheet-handle:hover {
    transform: translateX(-50%) translateY(-2px);
    border-color: rgba(96, 165, 250, 0.85);
    box-shadow:
      0 14px 32px -4px rgba(15, 23, 42, 0.7),
      0 6px 20px -2px rgba(59, 130, 246, 0.5),
      inset 0 1px 1px 0 rgba(255, 255, 255, 0.3);
  }

  .dashboard-draw-sheet-handle:active {
    transform: translateX(-50%) translateY(0);
  }

  .dashboard-draw-sheet-handle:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 3px rgba(56, 189, 248, 0.5),
      0 10px 25px -3px rgba(15, 23, 42, 0.6);
  }

  /* Left Icon Badge */
  .handle-icon-badge {
    position: relative;
    width: 26px;
    height: 26px;
    border-radius: 9999px;
    background: linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #4f46e5 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    box-shadow:
      0 2px 8px rgba(37, 99, 235, 0.4),
      inset 0 1px 1px rgba(255, 255, 255, 0.35);
    flex-shrink: 0;
  }

  :global(.handle-pen-icon) {
    transform: rotate(-10deg);
    transition: transform 0.2s ease;
  }

  .dashboard-draw-sheet-handle:hover :global(.handle-pen-icon) {
    transform: rotate(0deg) scale(1.1);
  }

  .label {
    font-size: 13.5px;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: #ffffff;
    line-height: 1;
  }

  /* Chevron */
  .handle-chevron {
    color: rgba(255, 255, 255, 0.6);
    display: flex;
    align-items: center;
    transition: transform 0.2s ease, color 0.2s ease;
  }

  .dashboard-draw-sheet-handle:hover .handle-chevron {
    color: #ffffff;
    transform: translateY(-1px);
  }

  /* ==========================================================================
     EXPANDED DRAW SHEET (MODAL/DRAWER)
     ========================================================================== */
  .dashboard-draw-sheet {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%) !important;
    width: min(460px, calc(100% - 32px));
    background: rgba(255, 255, 255, 0.98);
    -webkit-backdrop-filter: blur(20px);
    backdrop-filter: blur(20px);
    border: 1px solid #cbd5e1;
    border-bottom: none;
    border-radius: 16px 16px 0 0;
    box-shadow:
      0 -10px 30px rgba(15, 23, 42, 0.14),
      0 -4px 10px rgba(15, 23, 42, 0.06);
    z-index: 1001;
    padding: 8px 14px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  @media (max-width: 767px) {
    .dashboard-draw-sheet {
      width: min(460px, calc(100% - 24px));
    }
  }

  .sheet-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .sheet-title-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .sheet-icon-badge {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 4px rgba(37, 99, 235, 0.25);
    flex-shrink: 0;
  }

  .close-btn {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: transparent;
    border: none;
    color: #64748b;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .close-btn:hover {
    background: #f1f5f9;
    color: #0f172a;
  }

  /* Segmented Modes */
  .modes-segmented {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    background: #f1f5f9;
    padding: 3px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    margin: 0;
  }

  .mode-tab {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 5px 8px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    color: #475569;
    cursor: pointer;
    transition: all 0.15s ease;
    user-select: none;
  }

  .mode-radio-input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    margin: 0;
    z-index: 2;
  }

  .mode-tab:hover {
    color: #0f172a;
    background: rgba(255, 255, 255, 0.6);
  }

  .mode-tab.active {
    background: #2563eb;
    color: #ffffff;
    font-weight: 600;
    box-shadow: 0 1px 4px rgba(37, 99, 235, 0.3);
  }

  /* Status Card */
  .status-card {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 24px;
    padding: 4px 8px;
    border-radius: 6px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    font-size: 11.5px;
    font-weight: 500;
    color: #334155;
  }

  :global(.status-icon) {
    color: #2563eb;
  }

  .status-text {
    line-height: 1.3;
  }

  /* Actions */
  .actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
    margin-top: 2px;
  }

  .btn-reset {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: #f8fafc;
    color: #334155;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-reset:hover {
    background: #f1f5f9;
    color: #0f172a;
    border-color: #94a3b8;
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    color: #ffffff;
    border: none;
    border-radius: 6px;
    padding: 5px 14px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
    transition: all 0.15s ease;
  }

  .btn-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
    box-shadow: 0 3px 10px rgba(37, 99, 235, 0.4);
    transform: translateY(-1px);
  }

  .btn-primary:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .dashboard-draw-sheet,
    .dashboard-draw-sheet-handle,
    :global(.handle-pen-icon),
    .handle-chevron,
    .btn-primary {
      transition: none !important;
      animation: none !important;
    }
  }
</style>
