<script lang="ts">
  import { auditEvents, type MockAuditEvent } from '$lib/stores/audit';

  function targetLabel(ev: MockAuditEvent): string {
    switch (ev.entity) {
      case 'asset_attachment':
        return `${ev.assetId ?? '-'} / ${ev.attachmentId ?? '-'}`;
      case 'project_document_file':
        return `${ev.projectId} / ${ev.documentId ?? '-'}${ev.fileId ? ` / ${ev.fileId}` : ''}`;
      case 'project_document':
        return `${ev.projectId} / ${ev.documentId ?? '-'}`;
      case 'user_session':
        return `${ev.sessionId ?? '-'} / ${ev.actorName}`;
      default: {
        // Exhaustiveness check: if a new entity is added to MockAuditEntity,
        // TypeScript will fail to compile here until the switch is updated.
        const _exhaustive: never = ev.entity;
        return _exhaustive;
      }
    }
  }
</script>

<svelte:head><title>SIMANTA - Audit Log</title></svelte:head>

<div class="space-y-4">
  <div>
    <h1 class="text-2xl font-bold">Audit Log</h1>
    <p class="text-sm text-slate-500">
      Mock append-only event untuk aksi sensitif MVP: download/verify/delete dokumen proyek, upload/download/delete lampiran aset, force-logout sesi, percobaan recovery.
    </p>
  </div>
  <div class="card overflow-x-auto">
    {#if $auditEvents.length === 0}
      <p class="text-sm text-slate-500">Belum ada audit event mock pada sesi browser ini.</p>
    {:else}
      <table class="table">
        <thead>
          <tr>
            <th>Waktu</th>
            <th>Aksi</th>
            <th>Aktor</th>
            <th>Target</th>
            <th>Metadata</th>
          </tr>
        </thead>
        <tbody>
          {#each $auditEvents as event (event.id)}
            <tr data-testid="audit-row" data-entity={event.entity}>
              <td>{new Date(event.createdAt).toLocaleString('id-ID')}</td>
              <td><span class="badge bg-emerald-50 text-emerald-700">{event.action}</span></td>
              <td>{event.actorName}</td>
              <td>{targetLabel(event)}</td>
              <td class="text-xs text-slate-500">{event.metadata ? JSON.stringify(event.metadata) : '-'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>
