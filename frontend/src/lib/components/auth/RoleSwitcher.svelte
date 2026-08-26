<script lang="ts">
  import { PUBLIC_ENABLE_DEMO_ROLE_SWITCHER } from '$env/static/public';
  import { currentUser, roles, switchRole } from '$lib/stores/auth';
  import type { RoleName } from '$shared/enums';
  import { ChevronDown } from 'lucide-svelte';

  const enabled = PUBLIC_ENABLE_DEMO_ROLE_SWITCHER !== 'false';

  function handleChange(event: Event) {
    const target = event.currentTarget as HTMLSelectElement;
    switchRole(target.value as RoleName);
  }
</script>

{#if enabled && $currentUser}
  <label class="flex items-center gap-2 text-xs">
    <span class="sr-only">Pilih Role</span>
    <select
      aria-label="Pilih Role"
      class="input w-24 sm:w-32 md:w-40 !py-1 text-xs font-semibold"
      value={$currentUser.role}
      on:change={handleChange}
    >
      {#each roles as role}
        <option value={role}>{role}</option>
      {/each}
    </select>
  </label>
{/if}