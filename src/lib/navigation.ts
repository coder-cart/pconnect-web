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
  permission?: string;
  badge?: number;
}

/**
 * MVP sidebar:
 * - Internal: Home, Clients, Orders, Messages, Finance, Staff, Settings
 * - Client: Home, My Orders, Messages, Approvals, Team
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
    label: 'Orders',
    externalLabel: 'My Orders',
    icon: ClipboardList,
    permission: 'orders.view',
  },
  {
    href: '/clients',
    label: 'Clients',
    icon: Building2,
    permission: 'clients.view',
    internalOnly: true,
  },
  {
    href: '/finance',
    label: 'Finance',
    icon: Receipt,
    permission: 'finance.invoices.view_all',
    internalOnly: true,
  },
  {
    href: '/staff',
    label: 'Staff',
    icon: Users,
    permission: 'users.manage',
    internalOnly: true,
  },
  {
    href: '/team',
    label: 'Team',
    externalLabel: 'Team',
    icon: UsersRound,
    permission: 'clients.team_invite',
    externalOnly: true,
  },
  {
    href: '/approvals',
    label: 'Approvals',
    externalLabel: 'Approvals',
    icon: BadgeCheck,
    permission: 'approvals.respond',
    externalOnly: true,
  },
  {
    href: '/admin',
    label: 'Settings',
    icon: Settings,
    permission: 'users.manage',
    internalOnly: true,
  },
];

export function getNavItemLabel(item: NavItem, userType: 'internal' | 'external') {
  if (userType === 'external' && item.externalLabel) {
    return item.externalLabel;
  }

  return item.label;
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

    if (item.permission && !permissionCodes.includes(item.permission)) {
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
