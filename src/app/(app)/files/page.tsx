'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Download,
  FolderOpen,
  History,
  Pencil,
  Share2,
  Trash2,
  Upload,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { EmptyState, ErrorState } from '@/components/ui/StatePanels';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { apiDownload, apiRequest, apiUpload } from '@/lib/api-client';
import { ApiResponse, userIsExternal } from '@/lib/auth';
import { ShareFileModal } from '@/components/modals/ShareFileModal';
import { EditFileModal } from '@/components/modals/EditFileModal';
import { FileVersionsModal } from '@/components/files/FileVersionsModal';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

interface FileRecord {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  visibilityScope: 'internal' | 'shared_with_client';
  projectId?: string | null;
  createdAt: string;
  uploader?: { fullName: string; id?: string };
  project?: { name: string; code: string };
}

interface ProjectOption {
  id: string;
  name: string;
  code: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesPage() {
  const { user, refreshKey, notifyRefresh } = useWorkspace();
  const isExternal = userIsExternal(user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState('');
  const [visibilityScope, setVisibilityScope] = useState('internal');
  const [filterProjectId, setFilterProjectId] = useState('');
  const [filterVisibilityScope, setFilterVisibilityScope] = useState('');
  const [shareFile, setShareFile] = useState<FileRecord | null>(null);
  const [editFile, setEditFile] = useState<FileRecord | null>(null);
  const [versionsFile, setVersionsFile] = useState<FileRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function buildFilesQuery() {
    const params = new URLSearchParams();
    if (filterProjectId) params.set('projectId', filterProjectId);
    if (filterVisibilityScope) params.set('visibilityScope', filterVisibilityScope);
    const query = params.toString();
    return query ? `/files?${query}` : '/files';
  }

  function loadFiles() {
    setIsLoading(true);
    setErrorMessage(null);

    Promise.all([
      apiRequest<ApiResponse<FileRecord[]>>(buildFilesQuery()),
      apiRequest<ApiResponse<ProjectOption[]>>('/projects'),
    ])
      .then(([filesResponse, projectsResponse]) => {
        setFiles(filesResponse.data);
        setProjects(projectsResponse.data);
        if (!projectId && projectsResponse.data[0]) {
          setProjectId(projectsResponse.data[0].id);
        }
      })
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadFiles();
  }, [refreshKey, filterProjectId, filterVisibilityScope]);

  async function handleUpload(selectedFile: File) {
    const formData = new FormData();
    formData.append('file', selectedFile);

    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);
    params.set('visibilityScope', visibilityScope);

    setIsUploading(true);
    setErrorMessage(null);

    try {
      await apiUpload<ApiResponse<FileRecord>>(
        `/files/upload?${params.toString()}`,
        formData,
      );
      notifyRefresh();
      loadFiles();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(file: FileRecord) {
    try {
      await apiDownload(`/files/${file.id}/download`, file.fileName);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Download failed');
    }
  }

  async function handleDelete(file: FileRecord) {
    const confirmed = window.confirm(`Delete "${file.fileName}"?`);
    if (!confirmed) return;

    setErrorMessage(null);

    try {
      await apiRequest(`/files/${file.id}`, { method: 'DELETE' });
      notifyRefresh();
      loadFiles();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Delete failed');
    }
  }

  const internalCount = files.filter((f) => f.visibilityScope === 'internal').length;
  const sharedCount = files.filter(
    (f) => f.visibilityScope === 'shared_with_client',
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Files"
        description="Shared uploads and project attachments for your workspace."
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Files' },
        ]}
        action={
          isExternal ? undefined : (
            <>
              <input
                ref={fileInputRef}
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
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4" />
                {isUploading ? 'Uploading...' : 'Upload file'}
              </Button>
            </>
          )
        }
      />

      {!isExternal ? (
        <Card padding="sm">
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Attach to project"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              options={[
                { value: '', label: 'No project' },
                ...projects.map((project) => ({
                  value: project.id,
                  label: `${project.name} (${project.code})`,
                })),
              ]}
            />
            <Select
              label="Upload visibility"
              value={visibilityScope}
              onChange={(event) => setVisibilityScope(event.target.value)}
              options={[
                { value: 'internal', label: 'Internal' },
                { value: 'shared_with_client', label: 'Shared with client' },
              ]}
            />
          </div>
        </Card>
      ) : null}

      <Card padding="sm">
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Filter by project"
            value={filterProjectId}
            onChange={(event) => setFilterProjectId(event.target.value)}
            options={[
              { value: '', label: 'All projects' },
              ...projects.map((project) => ({
                value: project.id,
                label: `${project.name} (${project.code})`,
              })),
            ]}
          />
          {!isExternal ? (
            <Select
              label="Filter by visibility"
              value={filterVisibilityScope}
              onChange={(event) => setFilterVisibilityScope(event.target.value)}
              options={[
                { value: '', label: 'All visibility' },
                { value: 'internal', label: 'Internal' },
                { value: 'shared_with_client', label: 'Shared with client' },
              ]}
            />
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Internal files', count: internalCount },
          { label: 'Shared with client', count: sharedCount },
          { label: 'Total files', count: files.length },
        ].map((entry) => (
          <Card key={entry.label}>
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary)]">
              <FolderOpen className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-medium text-[var(--foreground)]">
              {entry.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
              {entry.count}
            </p>
          </Card>
        ))}
      </div>

      {errorMessage ? (
        <ErrorState title="Something went wrong" description={errorMessage} />
      ) : null}

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : files.length === 0 ? (
        <EmptyState
          title="No files yet"
          description={
            isExternal
              ? 'Shared project files will appear here when available.'
              : 'Upload a file to attach it to your workspace.'
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="min-w-[560px] w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Project</th>
                  <th className="px-3 py-2 font-medium">Size</th>
                  <th className="px-3 py-2 font-medium">Visibility</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr
                    key={file.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="px-3 py-3 font-medium text-[var(--foreground)]">
                      {file.fileName}
                    </td>
                    <td className="px-3 py-3 text-[var(--muted)]">
                      {file.project?.name ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-[var(--foreground)]">
                      {formatBytes(file.sizeBytes)}
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        variant={
                          file.visibilityScope === 'shared_with_client'
                            ? 'warning'
                            : 'neutral'
                        }
                      >
                        {file.visibilityScope === 'shared_with_client'
                          ? 'Client shared'
                          : 'Internal'}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void handleDownload(file)}
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                        {!isExternal ? (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setShareFile(file)}
                            >
                              <Share2 className="h-4 w-4" />
                              Share
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setEditFile(file)}
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setVersionsFile(file)}
                            >
                              <History className="h-4 w-4" />
                              Versions
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => void handleDelete(file)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ShareFileModal
        open={Boolean(shareFile)}
        fileId={shareFile?.id ?? null}
        fileName={shareFile?.fileName}
        onClose={() => setShareFile(null)}
        onShared={notifyRefresh}
      />

      <EditFileModal
        open={Boolean(editFile)}
        fileId={editFile?.id ?? null}
        fileName={editFile?.fileName ?? null}
        visibilityScope={editFile?.visibilityScope ?? null}
        onClose={() => setEditFile(null)}
        onUpdated={notifyRefresh}
      />

      <FileVersionsModal
        fileId={versionsFile?.id ?? null}
        fileName={versionsFile?.fileName}
        onClose={() => setVersionsFile(null)}
        onUpdated={() => {
          notifyRefresh();
          loadFiles();
        }}
      />
    </div>
  );
}
