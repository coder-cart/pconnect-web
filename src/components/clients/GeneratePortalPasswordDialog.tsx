'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';

interface GeneratePortalPasswordDialogProps {
  open: boolean;
  clientId: string;
  userId: string;
  userEmail: string;
  userName: string;
  onClose: () => void;
  onApplied: () => Promise<void> | void;
  onNotice: (message: string | null) => void;
  onError: (message: string | null) => void;
}

interface GeneratePasswordResult {
  id: string;
  email: string;
  temporaryPassword: string;
  mustChangePassword: boolean;
  expiresAt: string;
}

export function GeneratePortalPasswordDialog({
  open,
  clientId,
  userId,
  userEmail,
  userName,
  onClose,
  onApplied,
  onNotice,
  onError,
}: GeneratePortalPasswordDialogProps) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTemporaryPassword(null);
      setExpiresAt(null);
      setCopied(false);
      setBusy(false);
      return;
    }

    let cancelled = false;
    async function run() {
      setBusy(true);
      setCopied(false);
      onError(null);
      try {
        const response = await apiRequest<ApiResponse<GeneratePasswordResult>>(
          `/clients/${clientId}/users/${userId}/generate-temporary-password`,
          { method: 'POST' },
        );
        if (cancelled) return;
        setTemporaryPassword(response.data.temporaryPassword);
        setExpiresAt(response.data.expiresAt);
        await onApplied();
        onNotice(
          `Temporary password set for ${userEmail}. Share it securely — it is not emailed.`,
        );
      } catch (error) {
        if (cancelled) return;
        onError(
          error instanceof Error
            ? error.message
            : 'Unable to generate temporary password',
        );
        onClose();
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [open, clientId, userId, userEmail]);

  async function regenerate() {
    setBusy(true);
    setCopied(false);
    onError(null);
    try {
      const response = await apiRequest<ApiResponse<GeneratePasswordResult>>(
        `/clients/${clientId}/users/${userId}/generate-temporary-password`,
        { method: 'POST' },
      );
      setTemporaryPassword(response.data.temporaryPassword);
      setExpiresAt(response.data.expiresAt);
      await onApplied();
      onNotice(
        `Temporary password regenerated for ${userEmail}. Share it securely — it is not emailed.`,
      );
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : 'Unable to generate temporary password',
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyPassword() {
    if (!temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      onError('Unable to copy password to clipboard');
    }
  }

  const expiresLabel = expiresAt
    ? new Date(expiresAt).toLocaleString()
    : null;

  return (
    <Modal
      open={open}
      title="Temporary password"
      description={`Secure temporary password for ${userName} (${userEmail}).`}
      onClose={() => {
        if (!busy) onClose();
      }}
      size="md"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !temporaryPassword}
            onClick={() => void copyPassword()}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy password
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void regenerate()}
          >
            <RefreshCw className="h-4 w-4" />
            {busy ? 'Generating…' : 'Regenerate'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-[var(--muted)]">
          This password is already active and hashed on the server. The client
          must change it after signing in. It is never stored in plaintext or
          sent by email.
        </p>
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3">
          {temporaryPassword ? (
            <p className="break-all font-mono text-sm text-[var(--foreground)]">
              {temporaryPassword}
            </p>
          ) : (
            <p className="text-sm text-[var(--muted)]">Generating…</p>
          )}
        </div>
        {expiresLabel ? (
          <p className="text-xs text-[var(--muted)]">
            Expires {expiresLabel}. Existing sessions for this login were signed
            out.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
