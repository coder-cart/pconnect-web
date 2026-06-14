'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { LoadingState, ErrorState } from '@/components/ui/StatePanels';

interface ProjectDetail {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  status: string;
  visibilityScope: string;
  owner?: { fullName: string };
  clientOrganization?: { name: string } | null;
  tasks?: Array<{ id: string; title: string; status: string }>;
  members?: Array<{ user: { fullName: string }; roleInProject: string }>;
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiRequest<ApiResponse<ProjectDetail>>(`/projects/${params.id}`)
      .then((response) => setProject(response.data))
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }, [params.id]);

  if (isLoading) {
    return (
      <LoadingState
        title="Loading project"
        description="Fetching project details and related tasks."
      />
    );
  }

  if (errorMessage || !project) {
    return (
      <ErrorState
        title="Unable to load project"
        description={errorMessage ?? 'Project not found.'}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={project.description ?? `${project.code} · ${project.status}`}
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Projects', href: '/projects' },
          { label: project.name },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant="primary" className="capitalize">
          {project.status.replaceAll('_', ' ')}
        </Badge>
        <Badge variant="neutral">{project.code}</Badge>
        <Badge variant="neutral">
          {project.visibilityScope.replaceAll('_', ' ')}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Overview
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-[var(--muted)]">Owner</dt>
              <dd className="font-medium text-[var(--foreground)]">
                {project.owner?.fullName ?? 'Unassigned'}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Client</dt>
              <dd className="font-medium text-[var(--foreground)]">
                {project.clientOrganization?.name ?? 'Internal project'}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Team
          </h2>
          <ul className="mt-4 space-y-2">
            {(project.members ?? []).map((member) => (
              <li
                key={`${member.user.fullName}-${member.roleInProject}`}
                className="flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2 text-sm"
              >
                <span className="font-medium text-[var(--foreground)]">
                  {member.user.fullName}
                </span>
                <span className="text-[var(--muted)]">{member.roleInProject}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Recent Tasks
          </h2>
          <Link href="/tasks" className="text-sm font-medium text-[var(--primary)]">
            View all
          </Link>
        </div>
        <ul className="space-y-2">
          {(project.tasks ?? []).map((task) => (
            <li
              key={task.id}
              className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2"
            >
              <span className="text-sm text-[var(--foreground)]">{task.title}</span>
              <Badge variant="neutral" className="capitalize">
                {task.status.replaceAll('_', ' ')}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
