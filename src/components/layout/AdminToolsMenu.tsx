'use client';

import Link from 'next/link';
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

export function AdminToolsMenu() {
  return (
    <DropdownMenu
      align="left"
      menuClassName="min-w-60"
      trigger={
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
        >
          <Settings className="h-4 w-4" />
          Admin tools
        </button>
      }
    >
      <DropdownMenuLabel>Admin Tools</DropdownMenuLabel>
      <div className="flex items-center justify-between px-3 py-2 text-sm">
        <div>
          <p className="text-xs text-[var(--muted)]">Current plan</p>
          <p className="font-semibold">Free</p>
        </div>
        <span className="text-xs text-[var(--primary)]">Manage billing</span>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        <Link href="/admin" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Workspace settings
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem disabled>
        <Pencil className="h-4 w-4" />
        Edit workspace
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        <Link href="/staff" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Manage staff
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem disabled>
        <CreditCard className="h-4 w-4" />
        Apps & workflows
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
