'use client';

import { ReactNode, createContext, useContext } from 'react';
import { AuthenticatedUser } from '@/lib/auth';

interface WorkspaceContextValue {
  user: AuthenticatedUser;
  refreshKey: number;
  notifyRefresh: () => void;
  refreshUser: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  user,
  refreshKey,
  notifyRefresh,
  refreshUser,
  children,
}: {
  user: AuthenticatedUser;
  refreshKey: number;
  notifyRefresh: () => void;
  refreshUser: () => Promise<void>;
  children: ReactNode;
}) {
  return (
    <WorkspaceContext.Provider
      value={{ user, refreshKey, notifyRefresh, refreshUser }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }

  return context;
}
