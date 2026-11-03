'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TenantLogo } from '@/components/ui/TenantLogo';
import { ImageCropModal } from '@/components/ui/ImageCropModal';
import { apiRequest, apiUpload } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

interface WorkspaceDetails {
  id: string;
  name: string;
  slug: string;
  hasLogo: boolean;
  logoUpdatedAt: string | null;
}

export function WorkspaceBrandingCard() {
  const { refreshUser } = useWorkspace();
  const [workspace, setWorkspace] = useState<WorkspaceDetails | null>(null);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingName, setIsSavingName] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoCropSrc, setLogoCropSrc] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    apiRequest<ApiResponse<WorkspaceDetails>>('/workspace')
      .then((response) => {
        if (cancelled) return;
        setWorkspace(response.data);
        setName(response.data.name);
      })
      .catch((error) => {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load workspace branding',
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (logoCropSrc) URL.revokeObjectURL(logoCropSrc);
    };
  }, [logoCropSrc]);

  async function handleSaveName(event: FormEvent) {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName) {
      setErrorMessage('Workspace name is required.');
      return;
    }

    setIsSavingName(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      const response = await apiRequest<ApiResponse<WorkspaceDetails>>(
        '/workspace',
        {
          method: 'PATCH',
          body: JSON.stringify({ name: nextName }),
        },
      );
      setWorkspace(response.data);
      setName(response.data.name);
      setMessage('Workspace name saved.');
      await refreshUser();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save workspace name',
      );
    } finally {
      setIsSavingName(false);
    }
  }

  function handleLogoPick(file: File | undefined) {
    if (!file) return;
    if (logoCropSrc) URL.revokeObjectURL(logoCropSrc);
    setLogoCropSrc(URL.createObjectURL(file));
    setMessage(null);
    setErrorMessage(null);
  }

  function closeLogoCrop() {
    if (logoCropSrc) URL.revokeObjectURL(logoCropSrc);
    setLogoCropSrc(null);
  }

  async function handleLogoSave(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage(
        'Cropped logo must be 2 MB or smaller. Zoom out or try another image.',
      );
      return;
    }

    setLogoBusy(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiUpload<ApiResponse<WorkspaceDetails>>(
        '/workspace/logo',
        formData,
      );
      setWorkspace(response.data);
      setMessage('Workspace logo updated.');
      closeLogoCrop();
      await refreshUser();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to upload logo',
      );
    } finally {
      setLogoBusy(false);
    }
  }

  async function handleLogoRemove() {
    setLogoBusy(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      const response = await apiRequest<ApiResponse<WorkspaceDetails>>(
        '/workspace/logo',
        { method: 'DELETE' },
      );
      setWorkspace(response.data);
      setMessage('Workspace logo removed.');
      await refreshUser();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to remove logo',
      );
    } finally {
      setLogoBusy(false);
    }
  }

  return (
    <>
      <Card className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Workspace branding
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Company name and logo shown on staff affiliation badges. This is
            separate from the Colabdeck product mark.
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-[var(--muted)]">Loading branding…</p>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <TenantLogo
              name={workspace?.name ?? name}
              logoUpdatedAt={workspace?.logoUpdatedAt}
              className="h-16 w-16"
            />
            <div className="min-w-0 flex-1 space-y-4">
              <form className="space-y-3" onSubmit={(event) => void handleSaveName(event)}>
                <Input
                  label="Company name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Photophile NHC"
                  disabled={isSavingName}
                />
                <Button type="submit" disabled={isSavingName}>
                  {isSavingName ? 'Saving…' : 'Save name'}
                </Button>
              </form>

              <div className="flex flex-wrap gap-2">
                <label className="inline-flex min-h-touch cursor-pointer items-center rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm text-[var(--primary-foreground)] sm:h-10 sm:min-h-10">
                  {logoBusy
                    ? 'Working…'
                    : workspace?.logoUpdatedAt || workspace?.hasLogo
                      ? 'Replace logo'
                      : 'Upload logo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={logoBusy}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      handleLogoPick(file);
                    }}
                  />
                </label>
                {workspace?.logoUpdatedAt || workspace?.hasLogo ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={logoBusy}
                    onClick={() => void handleLogoRemove()}
                  >
                    Remove logo
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {message ? (
          <p className="text-sm text-[var(--success)]">{message}</p>
        ) : null}
        {errorMessage ? (
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : null}
      </Card>

      <ImageCropModal
        open={Boolean(logoCropSrc)}
        imageSrc={logoCropSrc}
        title="Adjust workspace logo"
        description="Choose a shape and background that match your company mark, then save."
        mode="logo"
        isSaving={logoBusy}
        onClose={closeLogoCrop}
        onSave={handleLogoSave}
      />
    </>
  );
}
