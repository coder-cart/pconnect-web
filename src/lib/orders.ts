export interface OrderSummary {
  id: string;
  code: string;
  name: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  inDate?: string | null;
  outDate?: string | null;
  imageCount: number;
  inFileCount?: number;
  outFileCount?: number;
  rejectedFileCount?: number;
  extraServiceCount?: number;
  revisionCount?: number;
  estimatedTatHours?: number | null;
  timeSpentMinutes?: number;
  services?: string | null;
  clientNotes?: string | null;
  internalNotes?: string | null;
  specialRequirements?: string | null;
  price?: string | null;
  cost?: string | null;
  artistRatePerImage?: string | null;
  workflowStatus?: {
    id: string;
    name: string;
    code: string;
    metadata?: Record<string, unknown> | null;
  } | null;
  folderStatus?: {
    id: string;
    name: string;
    code: string;
    metadata?: Record<string, unknown> | null;
  } | null;
  displayFolderStatus?: {
    id: string;
    name: string;
    code?: string | null;
    metadata?: Record<string, unknown> | null;
  } | null;
  conversationChannels?: Array<{
    id: string;
    name: string;
    type: string;
    conversationKind?: string | null;
  }>;
  conversationChannel?: { id: string; name: string; type: string } | null;
  assignedArtist?: { id: string; fullName: string } | null;
  assignedTeamLead?: { id: string; fullName: string } | null;
  assignedQa?: { id: string; fullName: string } | null;
  workAllocations?: Array<{
    id: string;
    assignedArtistUserId?: string | null;
    assignedArtist?: { id: string; fullName: string } | null;
    folderStatusId?: string | null;
    folderStatus?: {
      id: string;
      name: string;
      code?: string | null;
      metadata?: Record<string, unknown> | null;
    } | null;
    inFileCount?: number;
    outFileCount?: number;
    rejectedFileCount?: number;
    extraServiceCount?: number;
    price?: string | null;
    artistRatePerImage?: string | null;
    cost?: string | null;
    sortOrder?: number;
    label?: string | null;
    serviceLines?: Array<{
      service: { id: string; name: string; code: string };
    }>;
  }>;
  serviceLines?: Array<{
    clientPriceSnapshot?: string | number | null;
    clientEtaSnapshot?: number | null;
    service: {
      id: string;
      name: string;
      code: string;
      defaultUnit?: string | null;
    };
  }>;
  project?: { id: string; name: string; code: string } | null;
  clientOrganization?: { id: string; name: string; currency?: string | null } | null;
  _count?: { batches: number };
  invoices?: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: string;
    paidAmount: string;
    currency: string;
    dueDate: string;
  }>;
}

export interface OrderBatchSummary {
  id: string;
  code: string;
  name: string;
  subFolderName?: string | null;
  status: string;
  dueDate?: string | null;
  inDate?: string | null;
  inFileCount?: number;
  outFileCount?: number;
  servicesText?: string | null;
  folderStatus?: { id: string; name: string; code: string } | null;
  assignedEditor?: { id: string; fullName: string } | null;
  _count?: { assets: number };
}

type BadgeVariant =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger';

export function orderStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'completed':
    case 'delivered':
      return 'success';
    case 'in_production':
    case 'active':
      return 'primary';
    case 'cancelled':
      return 'danger';
    case 'draft':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function orderPriorityVariant(priority: string): BadgeVariant {
  if (priority === 'high' || priority === 'urgent') return 'danger';
  if (priority === 'medium') return 'warning';
  return 'neutral';
}

export function humanize(value: string): string {
  return value.replaceAll('_', ' ');
}

export const ORDER_STATUS_STEPS = [
  'draft',
  'active',
  'in_production',
  'delivered',
  'completed',
] as const;
