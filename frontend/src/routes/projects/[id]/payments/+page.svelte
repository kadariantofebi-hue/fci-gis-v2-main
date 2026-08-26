<script lang="ts">
  import { page } from '$app/stores';
  import { currentUser } from '$lib/stores/auth';
  import { canReadPaymentHistory } from '$lib/auth/permissions';
  import ProjectSubnav from '$lib/components/projects/ProjectSubnav.svelte';
  import { getProjectBundle } from '$lib/services/api/projects';

  let pays: any[] = [];
  let projectId = '';
  let paymentVisibilityKey = '';
  let loadSeq = 0;
  const money = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

  $: projectId = $page.params.id as string;
  $: nextPaymentVisibilityKey = `${projectId}:${$currentUser?.id ?? 'anonymous'}:${canReadPaymentHistory($currentUser)}`;
  $: if (projectId && nextPaymentVisibilityKey !== paymentVisibilityKey) {
    paymentVisibilityKey = nextPaymentVisibilityKey;
    pays = [];
    loadPayments();
  }

  async function loadPayments() {
    const seq = ++loadSeq;
    const includeSensitivePayments = canReadPaymentHistory($currentUser);
    if (!includeSensitivePayments) {
      pays = [];
      return;
    }
    const response = await getProjectBundle(projectId, { includeSensitivePayments });
    if (seq !== loadSeq) return;
    if (response.success) pays = response.data.payments;
  }
</script>

<svelte:head><title>SIMANTA - Riwayat Pembayaran</title></svelte:head>

<div class="space-y-4">
  <div>
    <div class="kicker">Administrasi Proyek GIS · read-only reference</div>
    <h1 class="text-2xl font-bold">Riwayat Pembayaran</h1>
    <p class="text-sm text-slate-500">Referensi invoice/termin/SP2D untuk audit proyek; halaman ini hanya baca dan tidak menyediakan aksi transaksi keuangan.</p>
  </div>

  {#if projectId}
    <ProjectSubnav {projectId} />
  {/if}

  <div class="rounded-xl bg-amber-50 p-4 text-amber-800">
    Riwayat/referensi administratif invoice/termin/SP2D. SIMANTA adalah arsip referensi administrasi dan audit proyek, bukan sistem keuangan sumber utama atau tempat transaksi keuangan.
  </div>

  <div class="card">
    {#each pays as payment}
      <div class="border-b py-3">
        <b>{payment.paymentTerm}</b>
        <div class="text-sm">Status history: <span class="badge bg-cyan-100 text-cyan-700" data-testid="payment-status">{payment.paymentStatus}</span></div>
        <div class="text-sm">
          {payment.invoiceNumber} • {money(payment.invoiceValue)} • {payment.sp2dNumber} ({payment.sp2dDate})
        </div>
      </div>
    {/each}
  </div>
</div>
