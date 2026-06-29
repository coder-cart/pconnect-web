export interface AssetVersion {
  id: string;
  versionNumber: number;
  kind: string;
  storageKey: string | null;
  thumbnailKey: string | null;
  notes: string | null;
  createdAt: string;
}

export interface AssetSummary {
  id: string;
  name: string;
  status: string;
  stage: string;
  instructions?: string | null;
  dueDate?: string | null;
  assignedEditor?: { id: string; fullName: string } | null;
  assignedQa?: { id: string; fullName: string } | null;
  currentVersion?: AssetVersion | null;
  batch?: { id: string; name: string; code: string } | null;
}

export interface BatchSummary {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  instructions?: string | null;
  status: string;
  stage: string;
  priority: string;
  dueDate?: string | null;
  assignedEditor?: { id: string; fullName: string } | null;
  assignedQa?: { id: string; fullName: string } | null;
  clientOrganization?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  _count?: { assets: number };
}

type BadgeVariant =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger';

export function batchStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'completed':
    case 'delivered':
    case 'approved':
      return 'success';
    case 'in_revision':
      return 'danger';
    case 'in_qa':
    case 'client_review':
      return 'warning';
    case 'in_progress':
    case 'assigned':
      return 'primary';
    default:
      return 'neutral';
  }
}

export function assetStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'approved':
    case 'delivered':
      return 'success';
    case 'revision_requested':
      return 'danger';
    case 'submitted':
    case 'in_qa':
      return 'warning';
    case 'in_progress':
    case 'assigned':
      return 'primary';
    default:
      return 'neutral';
  }
}

export function humanize(value: string): string {
  return value.replaceAll('_', ' ');
}
