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
  sourceLink?: string | null;
  outputFormat?: string | null;
  parentOrderId?: string | null;
  deliveryLink?: string | null;
  clientAcknowledgedAt?: string | null;
  historySavedAt?: string | null;
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

export type ClientLifecycleStage =
  | 'order_received'
  | 'in_progress'
  | 'quality_check'
  | 'ready_for_delivery'
  | 'delivered';

const LIFECYCLE_CODES: Record<ClientLifecycleStage, string[]> = {
  order_received: ['pending_review', 'waiting_for_files'],
  in_progress: ['assigned', 'editing', 'culling', 'retouching', 'revision_required'],
  quality_check: ['qa_review', 'client_review', 'approved'],
  ready_for_delivery: ['ready_for_delivery'],
  delivered: ['delivered', 'completed'],
};

export const MANAGER_WORKFLOW_OPTIONS: Array<{
  id: ClientLifecycleStage;
  label: string;
}> = [
  { id: 'order_received', label: 'Order received' },
  { id: 'in_progress', label: 'In-progress' },
  { id: 'quality_check', label: 'Quality check' },
  { id: 'ready_for_delivery', label: 'Ready for Delivery' },
  { id: 'delivered', label: 'Delivered' },
];

export const CLIENT_LIFECYCLE_LABELS: Record<ClientLifecycleStage, string> = {
  order_received: 'Order Received',
  in_progress: 'In Progress',
  quality_check: 'Quality Check',
  ready_for_delivery: 'Ready for Delivery',
  delivered: 'Delivered',
};

export interface OrderLifecycleSummary {
  total: number;
  newOrders: number;
  revisionOrders: number;
  activeOrders: number;
  groups: Array<{
    stage: ClientLifecycleStage;
    label: string;
    count: number;
    items: Array<{ id: string; code: string; name: string }>;
  }>;
}

export function clientLifecycleStage(
  workflowCode: string | null | undefined,
): ClientLifecycleStage | null {
  if (!workflowCode) return null;
  const match = (
    Object.entries(LIFECYCLE_CODES) as Array<[ClientLifecycleStage, string[]]>
  ).find(([, codes]) => codes.includes(workflowCode));
  return match?.[0] ?? null;
}

export function toExternalHref(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export const HIDDEN_ORDER_SERVICE_CODES = new Set([
  'PERSON_2_3',
  'PERSON_4_12',
  'PERSON_20_PLUS',
]);

export function isHiddenOrderService(code: string): boolean {
  return HIDDEN_ORDER_SERVICE_CODES.has(code.trim().toUpperCase());
}

export const ORDER_STATUS_STEPS = [
  'draft',
  'active',
  'in_production',
  'delivered',
  'completed',
] as const;
