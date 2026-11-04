import { AuthenticatedUser } from '@/lib/auth';
import { isEditorOnly } from '@/lib/navigation';

export type TourPersona =
  | 'studio_ops'
  | 'production'
  | 'client_full'
  | 'client_chat';

export interface TourStep {
  id: string;
  title: string;
  body: string;
  /** CSS selector for `data-tour` target. Skip step if missing. */
  target: string;
  /** Navigate here before highlighting (optional). */
  route?: string;
}

const STUDIO_OPS_ELEVATED = [
  'company_owner',
  'internal_admin',
  'internal_manager',
  'team_lead',
];

export function resolveTourPersona(user: AuthenticatedUser): TourPersona {
  if (user.userType === 'external') {
    return user.portalAccessLevel === 'chat_only'
      ? 'client_chat'
      : 'client_full';
  }

  const elevated = user.roleCodes.some((code) =>
    STUDIO_OPS_ELEVATED.includes(code),
  );
  const canManageOps =
    user.permissionCodes.includes('orders.manage') ||
    user.permissionCodes.includes('clients.manage');

  if (elevated || canManageOps) {
    return 'studio_ops';
  }

  if (
    isEditorOnly(user.roleCodes) ||
    (user.roleCodes.includes('qa') && !elevated)
  ) {
    return 'production';
  }

  return 'studio_ops';
}

const TOUR_STEPS: Record<TourPersona, TourStep[]> = {
  studio_ops: [
    {
      id: 'welcome',
      title: 'Welcome to Colabdeck',
      body: 'This short tour covers the main areas your role uses every day. You can replay it anytime from your profile menu.',
      target: '[data-tour="nav-home"]',
      route: '/dashboard',
    },
    {
      id: 'messages',
      title: 'Messages',
      body: 'Chat with your studio and clients. Shared client channels and DMs live here.',
      target: '[data-tour="nav-chat"]',
      route: '/chat',
    },
    {
      id: 'orders',
      title: 'Orders',
      body: 'Track jobs through production. Open an order for assignments, links, and delivery status.',
      target: '[data-tour="nav-orders"]',
      route: '/orders',
    },
    {
      id: 'clients',
      title: 'Clients',
      body: 'Manage client organizations, portal users, logos, and shared hubs.',
      target: '[data-tour="nav-clients"]',
      route: '/clients',
    },
    {
      id: 'create',
      title: 'Create',
      body: 'Use Create to start a new order, add a client, or invite staff when you have permission.',
      target: '[data-tour="topbar-create"]',
    },
    {
      id: 'profile',
      title: 'Your profile',
      body: 'Set your status, pause notifications, or reopen this tour from Get started.',
      target: '[data-tour="profile-menu"]',
    },
  ],
  production: [
    {
      id: 'welcome',
      title: 'Welcome to Colabdeck',
      body: 'Your workspace is built around Messages. Work is assigned to you on orders; chat with the team here.',
      target: '[data-tour="nav-chat"]',
      route: '/chat',
    },
    {
      id: 'messages',
      title: 'Messages is your home',
      body: 'Join channels and DMs for assigned work. Use threads and reactions to keep updates clear.',
      target: '[data-tour="nav-chat"]',
      route: '/chat',
    },
    {
      id: 'profile',
      title: 'Status and account',
      body: 'Set Active/Away and a custom status so teammates know when you are available.',
      target: '[data-tour="profile-menu"]',
    },
  ],
  client_full: [
    {
      id: 'welcome',
      title: 'Welcome to your portal',
      body: 'Use Home for an overview, Messages to talk with the studio, and Orders to create or update jobs.',
      target: '[data-tour="nav-home"]',
      route: '/dashboard',
    },
    {
      id: 'messages',
      title: 'Messages',
      body: 'Your organization hub and direct messages with studio managers live here.',
      target: '[data-tour="nav-chat"]',
      route: '/chat',
    },
    {
      id: 'orders',
      title: 'Orders',
      body: 'Create new work, add source links, and follow progress. Open an order to chat with the studio about it.',
      target: '[data-tour="nav-orders"]',
      route: '/orders',
    },
    {
      id: 'team',
      title: 'Team',
      body: 'Org admins can invite teammates and choose chat-only or chat + order access.',
      target: '[data-tour="nav-team"]',
      route: '/team',
    },
    {
      id: 'create',
      title: 'Create an order',
      body: 'When you can create orders, use Create in the top bar to start a new job quickly.',
      target: '[data-tour="topbar-create"]',
    },
    {
      id: 'profile',
      title: 'Your profile',
      body: 'Update your status and reopen this tour from Get started anytime.',
      target: '[data-tour="profile-menu"]',
    },
  ],
  client_chat: [
    {
      id: 'welcome',
      title: 'Welcome — chat access',
      body: 'Your account is set up for private messaging. Someone starts a 1:1 chat with you, or you message a teammate or studio manager.',
      target: '[data-tour="nav-chat"]',
      route: '/chat',
    },
    {
      id: 'messages',
      title: 'Messages only',
      body: 'You will not see Orders or shared hubs. Use Messages for direct conversations.',
      target: '[data-tour="nav-chat"]',
      route: '/chat',
    },
    {
      id: 'profile',
      title: 'Your profile',
      body: 'Set your status so people know you are available, and reopen this tour from Get started.',
      target: '[data-tour="profile-menu"]',
    },
  ],
};

export function getTourStepsForPersona(persona: TourPersona): TourStep[] {
  return TOUR_STEPS[persona];
}

/** Keep steps whose targets exist in the DOM (or have no target check after mount). */
export function filterAvailableTourSteps(steps: TourStep[]): TourStep[] {
  if (typeof document === 'undefined') {
    return steps;
  }
  return steps.filter((step) => Boolean(document.querySelector(step.target)));
}
