'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Plug } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/StatePanels';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';

interface Integration {
  provider: string;
  label: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
  accountLabel: string | null;
  lastSyncedAt: string | null;
}

function statusVariant(status: string) {
  if (status === 'connected') return 'success' as const;
  if (status === 'error') return 'danger' as const;
  return 'neutral' as const;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connectTarget, setConnectTarget] = useState<Integration | null>(null);
  const [accountLabel, setAccountLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function load() {
    setIsLoading(true);
    apiRequest<ApiResponse<Integration[]>>('/integrations')
      .then((response) => setIntegrations(response.data))
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleConnect(event?: FormEvent) {
    event?.preventDefault();
    if (!connectTarget) return;
    setIsSaving(true);
    try {
      await apiRequest(`/integrations/${connectTarget.provider}/connect`, {
        method: 'POST',
        body: JSON.stringify({ accountLabel: accountLabel.trim() || undefined }),
      });
      setConnectTarget(null);
      setAccountLabel('');
      load();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDisconnect(provider: string) {
    await apiRequest(`/integrations/${provider}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect external storage and sync deliverables into your workspace."
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Integrations' },
        ]}
      />

      {isLoading ? <ListSkeleton rows={3} /> : null}
      {!isLoading && errorMessage ? (
        <ErrorState
          title="Unable to load integrations"
          description={errorMessage}
        />
      ) : null}

      {!isLoading && !errorMessage ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {integrations.map((integration) => (
            <Card key={integration.provider}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary)]">
                  <Plug className="h-5 w-5" />
                </div>
                <Badge variant={statusVariant(integration.status)} className="capitalize">
                  {integration.status}
                </Badge>
              </div>

              <p className="mt-4 text-sm font-medium text-[var(--foreground)]">
                {integration.label}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {integration.description}
              </p>
              {integration.accountLabel ? (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Account:{' '}
                  <span className="text-[var(--foreground)]">
                    {integration.accountLabel}
                  </span>
                </p>
              ) : null}

              {integration.status === 'connected' ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  onClick={() => handleDisconnect(integration.provider)}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setConnectTarget(integration);
                    setAccountLabel('');
                  }}
                >
                  Connect
                </Button>
              )}
            </Card>
          ))}
        </div>
      ) : null}

      <Modal
        open={Boolean(connectTarget)}
        title={`Connect ${connectTarget?.label ?? ''}`.trim()}
        description="Label this connection so your team knows which account is linked."
        onClose={() => setConnectTarget(null)}
        footer={
          <ModalActions
            onCancel={() => setConnectTarget(null)}
            onSubmit={() => void handleConnect()}
            submitLabel="Connect"
            isSubmitting={isSaving}
          />
        }
      >
        <form className="space-y-4" onSubmit={handleConnect}>
          <Input
            label="Account label"
            value={accountLabel}
            onChange={(event) => setAccountLabel(event.target.value)}
            placeholder="e.g. studio@photophile.com"
          />
          <p className="text-xs text-[var(--muted)]">
            OAuth authorization completes on the provider; this records the
            linked account for your workspace.
          </p>
        </form>
      </Modal>
    </div>
  );
}
