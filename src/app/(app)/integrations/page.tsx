'use client';

import { Plug } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const INTEGRATIONS = [
  { name: 'Google Drive', status: 'Coming soon' },
  { name: 'OneDrive', status: 'Coming soon' },
  { name: 'Slack', status: 'Coming soon' },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect external tools and sync metadata into your workspace."
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Integrations' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {INTEGRATIONS.map((integration) => (
          <Card key={integration.name}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary)]">
                <Plug className="h-5 w-5" />
              </div>
              <Badge variant="neutral">{integration.status}</Badge>
            </div>

            <p className="mt-4 text-sm font-medium text-[var(--foreground)]">
              {integration.name}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              OAuth connection support is planned for a future release.
            </p>

            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              disabled
              title="OAuth integrations are coming in a future release"
            >
              Connect
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
