<script lang="ts">
  export let title = 'Akses ditolak';
  export let message = 'Role Anda tidak memiliki permission untuk membuka halaman atau aksi ini.';
</script>

<section class="card border-amber-200 bg-amber-50 text-amber-950" role="alert" aria-labelledby="forbidden-title">
  <div class="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">FORBIDDEN</div>
  <h1 id="forbidden-title" class="mt-2 text-2xl font-bold">{title}</h1>
  <p class="mt-2 max-w-2xl text-sm leading-6 text-amber-800">{message}</p>
  <a class="btn btn-secondary mt-4" href="/dashboard">Kembali ke Dashboard</a>
</section>
