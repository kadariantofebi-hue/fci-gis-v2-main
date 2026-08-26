<script lang="ts">
  import { toastStore, type Toast } from '$lib/stores/toast';
  import { CheckCircle2, Info, TriangleAlert, XCircle, X } from 'lucide-svelte';

  function iconFor(t: Toast) {
    if (t.kind === 'success') return CheckCircle2;
    if (t.kind === 'warning') return TriangleAlert;
    if (t.kind === 'error') return XCircle;
    return Info;
  }

  function toneClass(t: Toast) {
    if (t.kind === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    if (t.kind === 'warning') return 'border-amber-200 bg-amber-50 text-amber-900';
    if (t.kind === 'error') return 'border-rose-200 bg-rose-50 text-rose-900';
    return 'border-cyan-200 bg-cyan-50 text-cyan-900';
  }
</script>

<div class="pointer-events-none fixed right-4 top-20 z-50 flex w-80 flex-col gap-2" aria-live="polite" aria-atomic="false" data-testid="toast-stack">
  {#each $toastStore as t (t.id)}
    <div
      class="pointer-events-auto flex items-start gap-2 rounded-2xl border p-3 shadow-lg {toneClass(t)}"
      role="status"
      data-testid="toast"
      data-toast-kind={t.kind}
    >
      <svelte:component this={iconFor(t)} size={16} class="mt-0.5 shrink-0" />
      <div class="flex-1 text-sm leading-snug">{t.message}</div>
      <button
        type="button"
        class="ml-1 grid h-6 w-6 shrink-0 place-items-center rounded-full hover:bg-black/5"
        on:click={() => toastStore.dismiss(t.id)}
        aria-label="Tutup notifikasi"
      >
        <X size={12} />
      </button>
    </div>
  {/each}
</div>
