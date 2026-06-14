'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, CheckSquare, Users } from 'lucide-react';
import { ResourceListPage } from '@/components/ui/ResourceListPage';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { CreateProjectModal } from '@/components/modals/CreateProjectModal';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

interface ProjectItem {
  id: string;
  name: string;
  code: string;
  status: string;
  visibilityScope: string;
  description?: string | null;
}

function statusVariant(status: string) {
  if (status === 'completed') return 'success' as const;
  if (status === 'on_hold') return 'neutral' as const;
  if (status === 'active') return 'primary' as const;
  return 'warning' as const;
}

function progressForStatus(status: string) {
  if (status === 'completed') return 100;
  if (status === 'active') return 68;
  if (status === 'on_hold') return 35;
  return 12;
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

export default function ProjectsPage() {
  const { refreshKey, notifyRefresh } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <ResourceListPage<ProjectItem>
        title="Projects"
        description="Projects you can access based on membership and client visibility rules."
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Projects' },
        ]}
        endpoint="/projects"
        layout="grid"
        searchPlaceholder="Search projects..."
        filterOptions={STATUS_FILTERS}
        filterField="status"
        createLabel="New Project"
        onCreateClick={() => setCreateOpen(true)}
        refreshKey={refreshKey}
        emptyTitle="No projects yet"
        emptyDescription="Projects assigned to you will appear here."
        getSearchValue={(item) => `${item.name} ${item.code} ${item.status}`}
        getItemKey={(item) => item.id}
        renderItem={() => null}
        renderGridItem={(item) => {
          const progress = progressForStatus(item.status);

          return (
            <Card className="relative overflow-hidden transition-transform hover:-translate-y-0.5">
              <Link href={`/projects/${item.id}`} className="block">
                <div
                  className="absolute inset-x-0 top-0 h-1 bg-[var(--primary)]"
                  style={{
                    background:
                      item.status === 'completed'
                        ? 'var(--success)'
                        : item.status === 'on_hold'
                          ? 'var(--warning)'
                          : 'var(--primary)',
                  }}
                />

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {item.name}
                    </p>
                    <p className="text-xs text-[var(--muted)]">{item.code}</p>
                  </div>
                  <Badge variant={statusVariant(item.status)}>
                    {item.status.replaceAll('_', ' ')}
                  </Badge>
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-[var(--muted)]">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--surface-muted)]">
                    <div
                      className="h-2 rounded-full bg-[var(--primary)] transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {item.status.replaceAll('_', ' ')}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CheckSquare className="h-3.5 w-3.5" />
                    Tasks
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    Team
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    <Avatar name={item.name} size="sm" />
                  </div>
                  <Badge variant="neutral">
                    {item.visibilityScope.replaceAll('_', ' ')}
                  </Badge>
                </div>
              </Link>
            </Card>
          );
        }}
      />

      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={notifyRefresh}
      />
    </>
  );
}
