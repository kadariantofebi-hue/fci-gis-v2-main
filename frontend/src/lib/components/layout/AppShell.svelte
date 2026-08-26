<script lang="ts">
  import Sidebar from './Sidebar.svelte';
  import Navbar from './Navbar.svelte';
  import Toaster from './Toaster.svelte';
  import { sidebarVisible } from '$lib/stores/layout';

  export let fullWidth = false;

  // Keyboard shortcut Ctrl+B (Cmd+B di Mac) untuk toggle sidebar —
  // cf. SIDEBAR_KEYBOARD_SHORTCUT di shadcn-svelte Sidebar.
  function handleKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      sidebarVisible.update((v) => !v);
    }
  }
</script>
<svelte:window on:keydown={handleKeydown} />

<!-- --sidebar-width: lebar sidebar (cf. SIDEBAR_WIDTH shadcn-svelte, 18rem =
     w-72 lama). Dipakai oleh Sidebar.svelte untuk lebar root + konten inner. -->
<div class="min-h-screen bg-[#f6f8fb] text-slate-950" style:--sidebar-width="18rem">
  <a class="skip-link" href="#main-content">Lewati ke konten utama</a>
  <div class="flex min-h-screen">
    <Sidebar />
    <div class={fullWidth ? 'min-w-0 flex flex-1 flex-col min-h-0' : 'min-w-0 flex-1'}>
      <Navbar />
      <main
        id="main-content"
        class={fullWidth ? 'relative min-h-0 flex-1 overflow-hidden' : 'relative p-4 md:p-6 xl:p-8'}
        tabindex="-1"
      >
        <div class="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.10),transparent_36%),radial-gradient(circle_at_top_right,rgba(8,145,178,0.10),transparent_34%)]"></div>
        <div class={fullWidth ? 'relative h-full w-full' : 'relative mx-auto max-w-[1680px]'}>
          <slot />
        </div>
      </main>
    </div>
  </div>
  <Toaster />
</div>
