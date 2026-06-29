'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiRequest, apiUpload } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';

interface VersionRow {
  id: string;
  versionNumber: number;
  fileName: string;
  sizeBytes: number;
  note?: string | null;
  createdAt: string;
  uploader?: { fullName: string } | null;
}

interface VersionsResponse {
  current: {
    fileName: string;
    sizeBytes: number;
    updatedAt: string;
  };
  versions: VersionRow[];
}

interface FileVersionsModalProps {
  fileId: string | null;
  fileName?: string;
  onClose: () => void;
  onUpdated: () => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileVersionsModal({
  fileId,
  fileName,
  onClose,
  onUpdated,
}: FileVersionsModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<VersionsResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function load() {
    if (!fileId) return;
    apiRequest<ApiResponse<VersionsResponse>>(`/files/${fileId}/versions`)
      .then((response) => setData(response.data))
      .catch((error: Error) => setErrorMessage(error.message));
  }

  useEffect(() => {
    setData(null);
    setErrorMessage(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  async function handleUpload(file: File) {
    if (!fileId) return;
    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setErrorMessage(null);
    try {
      await apiUpload(`/files/${fileId}/versions`, formData);
      load();
      onUpdated();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Upload failed',
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Modal
      open={Boolean(fileId)}
      title={`Versions — ${fileName ?? ''}`.trim()}
      description="Upload a new version to replace the current file. Prior versions are archived."
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) {
            void handleUpload(selected);
            event.target.value = '';
          }
        }}
      />

      <Button
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
      >
        <Upload className="h-4 w-4" />
        {isUploading ? 'Uploading...' : 'Upload new version'}
      </Button>

      {errorMessage ? (
        <p className="mt-3 text-sm text-[var(--danger)]">{errorMessage}</p>
      ) : null}

      {data ? (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--primary)] bg-[var(--primary-soft)] px-3 py-2">
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {data.current.fileName}
              </p>
              <p className="text-xs text-[var(--muted)]">
                {formatBytes(data.current.sizeBytes)} · current
              </p>
            </div>
            <Badge variant="primary">Current</Badge>
          </div>

          {data.versions.map((version) => (
            <div
              key={version.id}
              className="flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2"
            >
              <div>
                <p className="text-sm text-[var(--foreground)]">
                  {version.fileName}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {formatBytes(version.sizeBytes)} ·{' '}
                  {version.uploader?.fullName ?? 'Unknown'} ·{' '}
                  {new Date(version.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Badge variant="neutral">v{version.versionNumber}</Badge>
            </div>
          ))}

          {data.versions.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              No previous versions yet.
            </p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
