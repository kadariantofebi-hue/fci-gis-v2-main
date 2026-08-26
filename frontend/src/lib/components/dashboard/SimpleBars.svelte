<script lang="ts">
  export let data: [string, number][] = [];
  $: max = Math.max(1, ...data.map((d) => d[1]));
</script>

<div class="space-y-3">
  {#each data as [label, value], index}
    <div>
      <div class="mb-1.5 flex justify-between gap-3 text-xs">
        <span class="truncate font-medium text-slate-600">{label}</span>
        <span class="font-black text-slate-900">{value}</span>
      </div>
      <div class="h-2.5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200/60">
        <div
          class={`h-2.5 rounded-full ${index % 3 === 0 ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : index % 3 === 1 ? 'bg-gradient-to-r from-cyan-500 to-sky-500' : 'bg-gradient-to-r from-amber-400 to-emerald-500'}`}
          style={`width:${(value / max) * 100}%`}
        ></div>
      </div>
    </div>
  {/each}
</div>
