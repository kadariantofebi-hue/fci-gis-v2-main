<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { currentUser } from '$lib/stores/auth';
  import { canAccessPath } from '$lib/auth/route-guards';
  import AppShell from '$lib/components/layout/AppShell.svelte';
  import ForbiddenState from '$lib/components/auth/ForbiddenState.svelte';

  $: isPublic = ['/login','/recovery'].includes($page.url.pathname);
  $: allowed = isPublic || canAccessPath($currentUser, $page.url.pathname);
  $: if (browser && !isPublic && !$currentUser) goto('/login');
  $: if (browser && isPublic && $currentUser && $page.url.pathname==='/login') goto('/dashboard');
</script>

<svelte:head>
  <title>SIMANTA - Frontend MVP</title>
</svelte:head>

{#if isPublic}
  <slot />
{:else}
  {#if $currentUser}
    <AppShell fullWidth={$page.url.pathname === '/dashboard'}>
      {#if allowed}
        <slot />
      {:else}
        <ForbiddenState />
      {/if}
    </AppShell>
  {:else}
    <div class="p-8">Memeriksa sesi...</div>
  {/if}
{/if}
