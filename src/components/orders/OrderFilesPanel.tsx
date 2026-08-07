'use client';

import { useEffect, useRef, useState } from 'react';
import { apiRequest, apiUpload } from '@/lib/api-client';
import { ApiResponse, userHasPermission } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

interface OrderFileItem {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sourceType?: string;
  storageKey?: string;
  orderFileRole?: string | null;
  visibilityScope: string;
  createdAt: string;
  uploader?: { fullName: string };
}

interface OrderFilesPanelProps {
  orderId: string;
  projectId?: string | null;
}

export function OrderFilesPanel({ orderId, projectId }: OrderFilesPanelProps) {
  const { user } = useWorkspace();
  // Backend permission code is files.upload_internal (underscore).
  const canUpload =
    userHasPermission(user, 'files.upload_internal') ||
    userHasPermission(user, 'orders.manage');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<OrderFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<'all' | 'input' | 'output' | 'reference'>(
    'all',
  );
  const [uploadRole, setUploadRole] = useState<'input' | 'output' | 'reference'>(
    'input',
  );
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    const roleQuery =
      roleFilter === 'all' ? '' : `&orderFileRole=${roleFilter}`;
    apiRequest<ApiResponse<OrderFileItem[]>>(
      `/files?orderId=${orderId}${roleQuery}`,
    )
      .then((response) => setFiles(response.data))
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [orderId, roleFilter]);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const query = new URLSearchParams({
        orderId,
        orderFileRole: uploadRole,
        ...(projectId ? { projectId } : {}),
        visibilityScope:
          uploadRole === 'output' ? 'shared_with_client' : 'internal',
      });
      await apiUpload(`/files/upload?${query.toString()}`, form);
      load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  async function handleAttachLink() {
    if (!linkUrl.trim()) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      await apiRequest('/files/link', {
        method: 'POST',
        body: JSON.stringify({
          url: linkUrl.trim(),
          title: linkTitle.trim() || undefined,
          orderId,
          projectId: projectId || undefined,
          orderFileRole: uploadRole,
          visibilityScope:
            uploadRole === 'output' ? 'shared_with_client' : 'internal',
        }),
      });
      setLinkUrl('');
      setLinkTitle('');
      load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to attach link',
      );
    } finally {
      setBusy(false);
    }
  }

  function fileHref(file: OrderFileItem) {
    if (
      file.sourceType === 'google_drive' ||
      file.sourceType === 'onedrive' ||
      file.mimeType === 'text/uri-list' ||
      (file.storageKey && /^https?:\/\//i.test(file.storageKey))
    ) {
      return file.storageKey;
    }
    return `/api/files/${file.id}/download`;
  }

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-[var(--foreground)]">
            Order files
          </h3>
          <p className="text-xs text-[var(--muted)]">
            Upload files or paste OneDrive / Google Drive links for this order.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(
                event.target.value as 'all' | 'input' | 'output' | 'reference',
              )
            }
            className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
          >
            <option value="all">All roles</option>
            <option value="input">Input</option>
            <option value="output">Output</option>
            <option value="reference">Reference</option>
          </select>
          {canUpload ? (
            <>
              <select
                value={uploadRole}
                onChange={(event) =>
                  setUploadRole(
                    event.target.value as 'input' | 'output' | 'reference',
                  )
                }
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
              >
                <option value="input">As input</option>
                <option value="output">As output</option>
                <option value="reference">As reference</option>
              </select>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                disabled={busy}
                onChange={handleUpload}
              />
              <Button
                size="sm"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                {busy ? 'Working…' : 'Upload file'}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {canUpload ? (
        <div className="mb-4 grid gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-3 sm:grid-cols-[1fr_1fr_auto]">
          <Input
            label="Drive / folder link"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            placeholder="https://onedrive.live.com/... or Google Drive"
          />
          <Input
            label="Label (optional)"
            value={linkTitle}
            onChange={(event) => setLinkTitle(event.target.value)}
            placeholder="Client source folder"
          />
          <div className="flex items-end">
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || !linkUrl.trim()}
              onClick={handleAttachLink}
            >
              Add link
            </Button>
          </div>
        </div>
      ) : (
        <p className="mb-3 text-xs text-[var(--muted)]">
          You can view shared files. Upload/link requires internal file permission.
        </p>
      )}

      {errorMessage ? (
        <p className="mb-2 text-sm text-[var(--danger)]">{errorMessage}</p>
      ) : null}
      {isLoading ? (
        <p className="text-sm text-[var(--muted)]">Loading files…</p>
      ) : files.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No files or links yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {files.map((file) => {
            const href = fileHref(file);
            const isLink =
              file.sourceType === 'google_drive' ||
              file.sourceType === 'onedrive' ||
              file.mimeType === 'text/uri-list';
            return (
              <li
                key={file.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    {file.fileName}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {(file.orderFileRole ?? 'untyped').replaceAll('_', ' ')}
                    {isLink
                      ? ` · ${file.sourceType === 'google_drive' ? 'Google Drive' : file.sourceType === 'onedrive' ? 'OneDrive' : 'Link'}`
                      : ` · ${Math.round(file.sizeBytes / 1024)} KB`}
                    {' · '}
                    {file.uploader?.fullName ?? 'Unknown'}
                  </p>
                </div>
                {href ? (
                  <a
                    href={href}
                    target={isLink ? '_blank' : undefined}
                    rel={isLink ? 'noreferrer' : undefined}
                    className="text-xs font-medium text-[var(--primary)] hover:underline"
                  >
                    {isLink ? 'Open' : 'Download'}
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
