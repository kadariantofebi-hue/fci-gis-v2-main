<script lang="ts">
  import { page } from '$app/stores';
  import { currentUser } from '$lib/stores/auth';
  import { canReadPaymentHistory, canReadProjectDocumentForProject } from '$lib/auth/permissions';

  export let projectId: string;

  $: currentPath = $page.url.pathname;
  $: items = [
    { href: `/projects/${projectId}`, label: 'Ringkasan Proyek' },
    { href: `/projects/${projectId}/milestones`, label: 'Timeline & Milestone' },
    ...(canReadProjectDocumentForProject($currentUser, projectId) ? [{ href: `/projects/${projectId}/documents`, label: 'Dokumen & Checklist' }] : []),
    ...(canReadPaymentHistory($currentUser) ? [{ href: `/projects/${projectId}/payments`, label: 'Riwayat Pembayaran' }] : []),
    { href: `/projects/${projectId}/assets`, label: 'Output ke Aset GIS' }
  ];

  function isActive(href: string) {
    if (href.includes('/milestones') || href.includes('/assets') || href.includes('/documents') || href.includes('/payments')) {
      return currentPath.startsWith(href);
    }
    return currentPath === href;
  }
</script>

<nav class="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Navigasi Administrasi Proyek GIS">
  {#each items as item}
    <a
      class="rounded-xl px-3 py-2 text-sm font-semibold {isActive(item.href) ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}"
      href={item.href}
      data-testid={`subnav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {item.label}
    </a>
  {/each}
</nav>
