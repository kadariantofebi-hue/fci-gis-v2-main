<script lang="ts">
  import { page } from '$app/stores';
  import { currentUser } from '$lib/stores/auth';
  import { sidebarVisible } from '$lib/stores/layout';
  import { can } from '$lib/auth/permissions';
  import { ClipboardList, FileBarChart, FolderKanban, History, Map, Settings2, UploadCloud } from 'lucide-svelte';

  // PRD v1.4: 'Aset Wilayah' nav di-drop (Modul Aset removal di v1.5 mayor, lihat PRD §16).
  // Hanya nav yang relevan dengan Pilar Administrasi Proyek GIS ditampilkan.
  const nav = [
    ['/dashboard', 'Dashboard Proyek GIS', 'project:read', Map],
    ['/projects', 'Administrasi Proyek GIS', 'project:read', FolderKanban],
    ['/opd', 'Profil OPD', 'opd:read', ClipboardList],
    ['/reports', 'Laporan', 'report:read', FileBarChart],
    ['/profile/preferences', 'Preferensi', 'prefs:read', Settings2],
    ['/tools', 'Import/Export/Atlas', 'asset:read', UploadCloud],
    ['/audit', 'Audit Log', 'audit:read', History]
  ] as const;
</script>

<!--
  Sidebar kiri — pola offcanvas terinspirasi shadcn-svelte Sidebar
  (https://www.shadcn-svelte.com/docs/components/sidebar):
  - Lebar via CSS var --sidebar-width (didefinisikan di AppShell, cf. SIDEBAR_WIDTH).
  - collapsible="offcanvas": saat disembunyikan, width transisi ke 0 dan konten
    ter-clip oleh overflow-hidden. Konten inner dipatok selebar --sidebar-width
    supaya tidak reflow selama animasi.
  - Trigger: shortcut Ctrl/Cmd+B (cf. SIDEBAR_KEYBOARD_SHORTCUT) di AppShell,
    plus trigger canonical di Navbar. State persisted di $lib/stores/layout
    (localStorage, cf. cookie sidebar_state milik shadcn).
  - Saat collapsed: aria-hidden + inert supaya konten tidak focusable/readable.
-->
<aside
  class="sidebar-root sticky top-0 hidden h-screen w-(--sidebar-width) shrink-0 overflow-hidden border-r border-white/10 bg-[#07111f] text-slate-100 shadow-2xl shadow-slate-950/20 md:block"
  class:sidebar-collapsed={!$sidebarVisible}
  aria-hidden={!$sidebarVisible}
  inert={!$sidebarVisible}
>
  <div class="relative flex h-full w-(--sidebar-width) flex-col">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(16,185,129,0.18),transparent_32%),radial-gradient(circle_at_110%_20%,rgba(8,145,178,0.14),transparent_30%)]"></div>
    <div class="relative p-5">
      <div class="flex items-center gap-3">
        <div class="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400/15 text-lg font-black text-emerald-300 ring-1 ring-emerald-300/25">S</div>
        <div class="min-w-0 flex-1">
          <div class="text-xl font-black tracking-tight text-white">SIMANTA</div>
          <div class="text-xs font-medium text-slate-400">Administrasi Proyek GIS</div>
        </div>
      </div>
    </div>

    <nav class="relative flex-1 space-y-1.5 px-3">
      {#each nav as [href, label, permission, Icon] (href)}
        {#if can($currentUser, permission as any)}
          {@const active = href === '/dashboard' ? $page.url.pathname === href : $page.url.pathname.startsWith(href)}
          <a
            href={href}
            class={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-950/30' : 'text-slate-300 hover:bg-white/7 hover:text-white'}`}
          >
            <span class={`grid h-8 w-8 place-items-center rounded-xl transition ${active ? 'bg-white/18 text-white' : 'bg-white/5 text-slate-400 group-hover:text-emerald-200'}`}>
              <Icon size={17} strokeWidth={2.2} />
            </span>
            <span>{label}</span>
          </a>
        {/if}
      {/each}
    </nav>
  </div>
</aside>

<style>
  /* Offcanvas collapse (cf. shadcn-svelte collapsible="offcanvas"):
     width → 0, konten inner tetap --sidebar-width dan ter-clip.
     CSS tak ber-layer menang atas utility Tailwind w-(--sidebar-width). */
  .sidebar-root {
    transition: width 200ms ease;
  }
  .sidebar-collapsed {
    width: 0;
    border-right-width: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .sidebar-root {
      transition: none;
    }
  }
</style>
