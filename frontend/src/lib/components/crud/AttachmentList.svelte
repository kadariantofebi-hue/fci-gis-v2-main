<script lang="ts">
  import type { AssetAttachment } from '$shared/schemas/asset';
  import { toastStore } from '$lib/stores/toast';
  import { recordAttachmentDownload, recordAttachmentDownloadBlocked, recordAttachmentDelete, recordAttachmentUpload } from '$lib/stores/audit';
  import { currentUser } from '$lib/stores/auth';
  import { Download, Trash2, ShieldCheck, ShieldAlert, FileWarning, Upload } from 'lucide-svelte';

  export let attachments: AssetAttachment[] = [];
  export let assetId: string = '';

  function formatBytes(n?: number): string {
    if (!n || n <= 0) return '-';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
  }

  function shortChecksum(c?: string): string {
    if (!c) return '-';
    return c.length > 12 ? `${c.slice(0, 8)}…` : c;
  }

  function isDownloadAllowed(a: AssetAttachment): boolean {
    // mock contract: blocked if not active clean OR sensitive without
    // permission (parent page is expected to filter sensitive out for
    // non-permitted roles; here we just respect isActive && scanStatus).
    return a.isActive === true && a.scanStatus === 'clean';
  }

  function onDownload(a: AssetAttachment) {
    const allowed = isDownloadAllowed(a);
    const actor = $currentUser?.name ?? 'Unknown user';
    const baseEvent = {
      projectId: '',
      assetId,
      attachmentId: a.id,
      actorName: actor,
      metadata: { kind: a.kind, filename: a.filename, scanStatus: a.scanStatus ?? '', mimeType: a.mimeType ?? '' }
    };
    if (!allowed) {
      const ev = recordAttachmentDownloadBlocked(baseEvent);
      toastStore.warning(`${ev.action}: file belum active clean atau permission tidak cukup.`);
      return;
    }
    const ev = recordAttachmentDownload(baseEvent);
    toastStore.info(`${ev.action} tercatat untuk ${ev.attachmentId}.`);
  }

  function onDelete(a: AssetAttachment) {
    const actor = $currentUser?.name ?? 'Unknown user';
    const ev = recordAttachmentDelete({
      projectId: '',
      assetId,
      attachmentId: a.id,
      actorName: actor,
      metadata: { kind: a.kind, filename: a.filename, scanStatus: a.scanStatus ?? '' }
    });
    toastStore.info(`${ev.action} tercatat untuk ${ev.attachmentId}.`);
    // mock: remove from local list (parent doesn't observe; this is a
    // optimistic local-state update for the demo).
    attachments = attachments.filter((x) => x.id !== a.id);
  }

  function onMockUpload() {
    // Mock upload: synthesize a new attachment with the PRD metadata
    // schema and record an ATTACHMENT_UPLOAD event.
    const id = `att-mock-${Date.now()}`;
    const now = new Date().toISOString();
    const actor = $currentUser?.name ?? 'Unknown user';
    const newAttachment: AssetAttachment = {
      id,
      kind: 'dokumen_pendukung',
      filename: `mock_upload_${id}.pdf`,
      objectKey: `mock://uploads/${id}.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 1024 * 256,
      scanStatus: 'pending',
      isActive: true,
      isSensitive: false,
      isVersioned: false,
      uploadedBy: actor,
      uploadedAt: now,
      description: 'Mock upload dari AttachmentList'
    };
    attachments = [...attachments, newAttachment];
    const ev = recordAttachmentUpload({
      projectId: '',
      assetId,
      attachmentId: id,
      actorName: actor,
      metadata: { kind: newAttachment.kind, filename: newAttachment.filename, scanStatus: newAttachment.scanStatus ?? '' }
    });
    toastStore.info(`${ev.action} tercatat untuk ${ev.attachmentId} (mock, scanStatus=pending).`);
  }
</script>

<div class="space-y-2" data-testid="attachment-list">
  <div class="flex items-center justify-between">
    <h3 class="text-base font-bold text-slate-950">Lampiran asset_attachments</h3>
    <button class="btn btn-secondary !text-xs" type="button" on:click={onMockUpload} data-testid="attachment-upload-mock">
      <Upload size={14} /> Mock upload
    </button>
  </div>

  {#if attachments.length === 0}
    <div class="rounded-xl bg-slate-50 p-3 text-sm text-slate-500" data-testid="attachment-empty">
      Belum ada lampiran. Mock upload di atas untuk menambah.
    </div>
  {/if}

  {#each attachments as a (a.id)}
    <div class="rounded-xl border border-slate-200 p-3" data-testid="attachment-row" data-attachment-id={a.id}>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="truncate font-medium text-slate-950">{a.filename}</span>
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">{a.kind}</span>
            {#if a.isSensitive}
              <span class="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">Sensitif</span>
            {/if}
            {#if !a.isActive}
              <span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">Inactive</span>
            {/if}
            {#if a.scanStatus === 'blocked'}
              <span class="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">Blocked</span>
            {:else if a.scanStatus === 'pending'}
              <span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">Pending</span>
            {:else}
              <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Clean</span>
            {/if}
          </div>
          <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span data-testid="attachment-mime">{a.mimeType ?? '—'}</span>
            <span data-testid="attachment-size">{formatBytes(a.sizeBytes)}</span>
            <span data-testid="attachment-checksum">sha256: {shortChecksum(a.checksumSha256)}</span>
            <span data-testid="attachment-uploadedBy">{a.uploadedBy ?? '—'}</span>
            <span data-testid="attachment-uploadedAt">{a.uploadedAt ?? '—'}</span>
          </div>
          {#if a.description}
            <div class="mt-1 text-xs text-slate-500">{a.description}</div>
          {/if}
        </div>
        <div class="flex shrink-0 items-center gap-2">
          {#if isDownloadAllowed(a)}
            <button class="btn btn-secondary !text-xs" type="button" on:click={() => onDownload(a)} data-testid="attachment-download" data-attachment-action="download">
              <Download size={14} /> Unduh
            </button>
          {:else}
            <button class="btn btn-secondary !text-xs opacity-50" type="button" disabled data-testid="attachment-download-blocked">
              <ShieldAlert size={14} /> Tidak dapat diunduh
            </button>
          {/if}
          <button class="btn btn-secondary !text-xs" type="button" on:click={() => onDelete(a)} data-testid="attachment-delete" data-attachment-action="delete">
            <Trash2 size={14} /> Hapus
          </button>
        </div>
      </div>
    </div>
  {/each}
</div>
