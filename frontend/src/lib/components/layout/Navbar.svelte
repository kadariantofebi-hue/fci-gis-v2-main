<script lang="ts">
  import { goto } from '$app/navigation';
  import { currentUser, logout } from '$lib/stores/auth';
  import { sidebarVisible } from '$lib/stores/layout';
  import RoleSwitcher from '$lib/components/auth/RoleSwitcher.svelte';
  import { Bell, LogOut, PanelLeft, Search } from 'lucide-svelte';

  function out() {
    logout();
    goto('/login');
  }
</script>

<header class="sticky top-0 z-20 border-b border-slate-200/80 bg-white/88 px-3 py-2.5 backdrop-blur-xl sm:px-4 sm:py-3 md:px-6 xl:px-8">
  <div class="mx-auto flex max-w-[1680px] items-center justify-between gap-2 sm:gap-3 md:gap-4">
    <div class="flex min-w-0 shrink items-center gap-2 sm:gap-3">
      <!-- Sidebar.Trigger canonical (cf. shadcn-svelte): toggle sidebar kiri
           dari Navbar. Selalu tersedia di semua halaman sebagai cara restore;
           shortcut Ctrl+B juga tersedia (lihat AppShell). -->
      <button
        type="button"
        aria-label={$sidebarVisible ? 'Sembunyikan sidebar' : 'Tampilkan sidebar'}
        aria-expanded={$sidebarVisible}
        title={$sidebarVisible ? 'Sembunyikan sidebar (Ctrl+B)' : 'Tampilkan sidebar (Ctrl+B)'}
        data-testid="navbar-sidebar-trigger"
        class="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
        on:click={() => sidebarVisible.set(!$sidebarVisible)}
      >
        <PanelLeft size={16} />
        <span class="sr-only">Toggle sidebar</span>
      </button>
      <div class="min-w-0 truncate">
        <div class="kicker truncate text-[0.7rem] sm:text-xs">SIMANTA · Administrasi Proyek GIS</div>
      </div>
    </div>

    <div class="hidden min-w-[240px] max-w-md flex-1 items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 shadow-inner xl:flex">
      <Search size={16} class="mr-2 shrink-0 text-slate-400" />
      <span class="truncate">Cari proyek, OPD, atau dokumen…</span>
    </div>

    <div class="flex shrink-0 items-center gap-1.5 sm:gap-2.5 md:gap-3">
      <RoleSwitcher />
      <button class="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl sm:rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50" aria-label="Notifikasi">
        <Bell size={17} />
      </button>
      <div class="flex items-center gap-2 rounded-xl sm:rounded-2xl sm:border sm:border-slate-200 sm:bg-white sm:px-3 sm:py-2 sm:shadow-sm">
        <div class="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-xs sm:text-sm font-black text-white" title={$currentUser?.name}>
          {($currentUser?.name ?? 'U').slice(0, 1)}
        </div>
        <div class="hidden text-right text-sm leading-tight md:block">
          <div class="font-bold text-slate-950">{$currentUser?.name}</div>
          <div class="text-xs font-medium text-slate-500">{$currentUser?.role}</div>
        </div>
      </div>
      <button class="btn btn-secondary !px-2.5 sm:!px-3" on:click={out} aria-label="Logout" title="Logout">
        <LogOut size={16} />
        <span class="hidden xl:inline">Logout</span>
      </button>
    </div>
  </div>
</header>