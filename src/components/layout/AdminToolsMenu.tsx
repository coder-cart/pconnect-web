'use client';

import {
  Building2,
  CreditCard,
  Pencil,
  Settings,
  Users,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';

export function AdminToolsMenu({
  showSettings,
  showStaff,
  onNavigate,
}: {
  showSettings: boolean;
  showStaff: boolean;
  onNavigate?: () => void;
}) {
  return (
    <DropdownMenu
      align="left"
      side="top"
      menuClassName="min-w-60"
      trigger={
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--shell-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]"
        >
          <Settings className="h-[var(--icon-md)] w-[var(--icon-md)] stroke-[1.75]" />
          Admin tools
        </button>
      }
    >
      <DropdownMenuLabel>Admin Tools</DropdownMenuLabel>
      <div className="flex items-center justify-between px-3 py-2 text-sm">
        <div>
          <p className="text-xs text-[var(--muted)]">Current plan</p>
          <p className="font-semibold text-[var(--foreground)]">Free</p>
        </div>
        <span className="text-xs text-[var(--primary)]">Manage billing</span>
      </div>
      <DropdownMenuSeparator />
      {showSettings ? (
        <DropdownMenuItem href="/admin" onClick={onNavigate}>
          <Building2 className="h-[var(--icon-md)] w-[var(--icon-md)] stroke-[1.75]" />
          Workspace settings
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem disabled>
        <Pencil className="h-[var(--icon-md)] w-[var(--icon-md)] stroke-[1.75]" />
        Edit workspace
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      {showStaff ? (
        <DropdownMenuItem href="/staff" onClick={onNavigate}>
          <Users className="h-[var(--icon-md)] w-[var(--icon-md)] stroke-[1.75]" />
          Manage staff
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem disabled>
        <CreditCard className="h-[var(--icon-md)] w-[var(--icon-md)] stroke-[1.75]" />
        Apps & workflows
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
