'use client';

import { useState } from 'react';
import { apiRequest } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

/**
 * Productized wrapper around the Excel import script workflow.
 * Upload Guidance + dry-run notes for operators; full parsing remains CLI-backed
 * until the multipart import API is promoted further.
 */
export function OrderImportPanel() {
  const [tenantId, setTenantId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function copyCommand() {
    const command = [
      'npx ts-node --transpile-only scripts/import-excel-orders.ts',
      `--tenant-id ${tenantId || '<tenantId>'}`,
      `--project-id ${projectId || '<projectId>'}`,
      '--master <path-to-master.xlsx>',
      '--sheet June',
      '[--mac <path-to-mac.xlsx>]',
      '[--dry-run]',
    ].join(' ');
    await navigator.clipboard.writeText(command);
    setMessage('Import command copied to clipboard.');
  }

  async function validateAccess() {
    setBusy(true);
    setMessage(null);
    try {
      await apiRequest('/orders?pageSize=1');
      setMessage(
        'Orders API reachable. Run the CLI command from pconnect-api with Master + Mac sheets.',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Validation failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h3 className="text-sm font-medium text-[var(--foreground)]">
        Excel order import
      </h3>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Import Job Tracker Master Sheet rows into Orders and Mac sub-folders into
        Batches. Service codes map to OrderServiceLine rows.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Input
          label="Tenant ID"
          value={tenantId}
          onChange={(event) => setTenantId(event.target.value)}
          placeholder="uuid"
        />
        <Input
          label="Project ID"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          placeholder="uuid"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={copyCommand}>
          Copy CLI command
        </Button>
        <Button size="sm" variant="secondary" onClick={validateAccess} disabled={busy}>
          Validate access
        </Button>
      </div>
      {message ? (
        <p className="mt-3 text-sm text-[var(--muted)]">{message}</p>
      ) : null}
    </Card>
  );
}
