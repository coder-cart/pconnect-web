import {
  BadgeCheck,
  BarChart3,
  Briefcase,
  Brush,
  Building2,
  CreditCard,
  FolderOpen,
  Home,
  Inbox,
  LayoutGrid,
  MessageSquare,
  Package,
  Plug,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  externalLabel?: string;
  internalOnly?: boolean;
  permission?: string;
  badge?: number;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/chat', label: 'Chat', externalLabel: 'Messages', icon: MessageSquare },
  { href: '/projects', label: 'Projects', icon: Briefcase },
  { href: '/production', label: 'Production', icon: Package, internalOnly: true },
  { href: '/my-work', label: 'My Work', icon: Brush, internalOnly: true },
  { href: '/qa', label: 'QA Review', icon: ShieldCheck, permission: 'qa.review' },
  {
    href: '/approvals',
    label: 'Approvals',
    externalLabel: 'Approvals',
    icon: BadgeCheck,
    permission: 'approvals.respond',
  },
  { href: '/tasks', label: 'Tasks', icon: LayoutGrid },
  { href: '/clients', label: 'Clients', icon: Building2, permission: 'clients.view' },
  { href: '/files', label: 'Files', icon: FolderOpen },
  {
    href: '/finance',
    label: 'Finance',
    icon: CreditCard,
    internalOnly: true,
  },
  {
    href: '/reports',
    label: 'Reports',
    icon: BarChart3,
    permission: 'reports.view',
  },
  { href: '/integrations', label: 'Integrations', icon: Plug, internalOnly: true },
  { href: '/admin', label: 'Settings', icon: Settings, permission: 'users.manage' },
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

  for (const [code, label] of ROLE_LABELS) {
    if (roleCodes.includes(code)) {
      return label;
    }
  }

  return 'Team Member';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
