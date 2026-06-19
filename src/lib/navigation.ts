import {
  Briefcase,
  Building2,
  CreditCard,
  FolderOpen,
  Home,
  Inbox,
  LayoutGrid,
  MessageSquare,
  Plug,
  Settings,
  Shield,
  Users,
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
  { href: '/tasks', label: 'Tasks', icon: LayoutGrid },
  { href: '/clients', label: 'Clients', icon: Building2, permission: 'clients.view' },
  { href: '/files', label: 'Files', icon: FolderOpen },
  {
    href: '/finance',
    label: 'Finance',
    icon: CreditCard,
    internalOnly: true,
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

export function getRoleLabel(
  userType: 'internal' | 'external',
  roleCodes: string[],
): string {
  if (userType === 'external') {
    return 'External Client';
  }

  if (roleCodes.includes('internal_admin')) {
    return 'Admin';
  }

  if (roleCodes.includes('internal_manager')) {
    return 'Manager';
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
