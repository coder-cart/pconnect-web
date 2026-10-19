import {
  BadgeCheck,
  Building2,
  ClipboardList,
  Home,
  MessageSquare,
  Receipt,
  Settings,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  externalLabel?: string;
  /** When true, item is only shown to internal users. */
  internalOnly?: boolean;
  /** When true, item is only shown to external (client) users. */
  externalOnly?: boolean;
  /** Show when the user has any one of these permissions. */
  permissions?: string[];
  badge?: number;
}

/**
 * Sidebar items appear only when the signed-in role has the matching permission.
 * Internal-only items stay hidden from client accounts.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  {
    href: '/chat',
    label: 'Messages',
    externalLabel: 'Messages',
    icon: MessageSquare,
  },
  {
    href: '/orders',
    label: 'Order Report',
    externalLabel: 'Order',
    icon: ClipboardList,
    permissions: ['orders.view'],
  },
  {
    href: '/clients',
    label: 'Clients',
    icon: Building2,
    permissions: ['clients.view'],
    internalOnly: true,
  },
  {
    href: '/finance',
    label: 'Finance',
    icon: Receipt,
    permissions: [
      'finance.invoices.view_all',
      'finance.invoices.create',
      'payments.manage',
    ],
    internalOnly: true,
  },
  {
    href: '/staff',
    label: 'Staff',
    icon: Users,
    permissions: ['users.manage'],
    internalOnly: true,
  },
  {
    href: '/team',
    label: 'Team',
    externalLabel: 'Team',
    icon: UsersRound,
    permissions: ['clients.team_invite'],
    externalOnly: true,
  },
  {
    href: '/approvals',
    label: 'Approvals',
    externalLabel: 'Approvals',
    icon: BadgeCheck,
    permissions: ['approvals.respond'],
    externalOnly: true,
  },
  {
    href: '/admin',
    label: 'Settings',
    icon: Settings,
    permissions: [
      'users.manage',
      'roles.manage',
      'master_data.manage',
      'audit.view',
    ],
    internalOnly: true,
  },
];

const ROUTE_RULES: Array<{
  prefix: string;
  permissions: string[];
  internalOnly?: boolean;
  externalOnly?: boolean;
}> = [
  { prefix: '/orders', permissions: ['orders.view'] },
  { prefix: '/clients', permissions: ['clients.view'], internalOnly: true },
  {
    prefix: '/finance',
    permissions: [
      'finance.invoices.view_all',
      'finance.invoices.create',
      'payments.manage',
    ],
    internalOnly: true,
  },
  { prefix: '/staff', permissions: ['users.manage'], internalOnly: true },
  { prefix: '/team', permissions: ['clients.team_invite'], externalOnly: true },
  { prefix: '/approvals', permissions: ['approvals.respond'], externalOnly: true },
  {
    prefix: '/admin',
    permissions: [
      'users.manage',
      'roles.manage',
      'master_data.manage',
      'audit.view',
    ],
    internalOnly: true,
  },
  {
    prefix: '/production',
    permissions: ['production.view', 'batches.manage'],
    internalOnly: true,
  },
  { prefix: '/reports', permissions: ['reports.view'], internalOnly: true },
  {
    prefix: '/qa',
    permissions: ['qa.review', 'qa.approve'],
    internalOnly: true,
  },
  {
    prefix: '/integrations',
    permissions: ['integrations.manage'],
    internalOnly: true,
  },
  {
    prefix: '/tasks',
    permissions: ['tasks.view_internal', 'tasks.create'],
    internalOnly: true,
  },
  {
    prefix: '/projects',
    permissions: ['projects.view_internal', 'projects.create'],
    internalOnly: true,
  },
  {
    prefix: '/files',
    permissions: ['files.upload_internal', 'assets.manage'],
    internalOnly: true,
  },
  {
    prefix: '/my-work',
    permissions: ['tasks.view_internal', 'production.view'],
    internalOnly: true,
  },
];

export function canAccessPath(
  pathname: string,
  userType: 'internal' | 'external',
  permissionCodes: string[],
): boolean {
  const rule = ROUTE_RULES.find(
    (item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`),
  );
  if (!rule) return true;
  if (rule.internalOnly && userType === 'external') return false;
  if (rule.externalOnly && userType === 'internal') return false;
  return rule.permissions.some((code) => permissionCodes.includes(code));
}

export function getNavItemLabel(item: NavItem, userType: 'internal' | 'external') {
  if (userType === 'external' && item.externalLabel) {
    return item.externalLabel;
  }

  return item.label;
}

export function isWorkspaceAdmin(roleCodes: string[]): boolean {
  return (
    roleCodes.includes('company_owner') || roleCodes.includes('internal_admin')
  );
}

export function getVisibleNavItems(
  userType: 'internal' | 'external',
  permissionCodes: string[],
): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.internalOnly && userType === 'external') {
      return false;
    }

    if (item.externalOnly && userType === 'internal') {
      return false;
    }

    if (
      item.permissions?.length &&
      !item.permissions.some((code) => permissionCodes.includes(code))
    ) {
      return false;
    }

    return true;
  });
}

const ROLE_LABELS: Array<[string, string]> = [
  ['company_owner', 'Company Owner'],
  ['internal_admin', 'Admin'],
  ['internal_manager', 'Manager'],
  ['team_lead', 'Team Lead'],
  ['qa', 'QA Reviewer'],
  ['editor', 'Editor'],
  ['external_client', 'Client'],
];

export function getRoleLabel(
  userType: 'internal' | 'external',
  roleCodes: string[],
): string {
  if (userType === 'external') {
    return 'Client';
  }

  const labels = ROLE_LABELS.filter(([code]) => roleCodes.includes(code)).map(
    ([, label]) => label,
  );
  if (labels.length === 0) {
    return 'Team Member';
  }
  return labels.join(' + ');
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
