/**
 * Marketing copy grounded in verified product capabilities.
 * Do not add claims for milestones, budgets, calendar/timeline,
 * full Drive/OneDrive OAuth sync, social login, or published prices
 * until those exist in the product.
 */

export const HOME_FAQS = [
  {
    question: 'What is Colabdeck?',
    answer:
      'Colabdeck is a collaboration workspace that combines team chat, projects, tasks, file sharing, client onboarding, and role-gated finance in one place — with clear separation between internal work and what external clients can see.',
  },
  {
    question: 'Who is Colabdeck for?',
    answer:
      'Client-facing teams such as creative agencies, photo and post-production groups, marketing agencies, and service businesses that need staff and clients collaborating without exposing internal notes or restricted records.',
  },
  {
    question: 'How do clients access Colabdeck?',
    answer:
      'Workspace admins invite clients into shared channels, tasks, files, and onboarding items. Clients only see content approved for external visibility — not internal-only notes, private files, or restricted finance data.',
  },
  {
    question: 'Does Colabdeck replace Slack and project tools?',
    answer:
      'Colabdeck is designed to reduce tool switching by keeping conversations, delivery work, files, and invoices connected. Many teams use it as their primary workspace for client delivery.',
  },
  {
    question: 'Is self-serve signup available?',
    answer:
      'Access is invite-based for your company workspace. Book a demo and we will help you evaluate fit and plan rollout.',
  },
] as const;

export const PRICING_FAQS = [
  {
    question: 'Are public prices available yet?',
    answer:
      'Plan packaging is configurable per workspace. Contact us or book a demo for a quote based on team size, client access needs, and finance requirements.',
  },
  {
    question: 'What is included in every workspace?',
    answer:
      'Chat, projects, tasks, files with internal vs shared scope, client onboarding workflows, role-based permissions, and optional finance modules for authorized roles.',
  },
  {
    question: 'Can we start with a subset of modules?',
    answer:
      'Yes. During onboarding we can prioritize the modules your team needs first — for example chat and projects, then client portal and finance.',
  },
  {
    question: 'How do upgrades and cancellations work?',
    answer:
      'Commercial terms are confirmed in your agreement. Until public self-serve billing ships, changes are handled with our team.',
  },
] as const;

export const FEATURE_SECTIONS = [
  {
    id: 'chat',
    title: 'Team chat and channels',
    problem: 'Client updates and delivery questions get lost across email and chat apps.',
    benefit:
      'Keep channels, DMs, threads, mentions, reactions, pins, and attachments next to the work they belong to.',
    points: [
      'Public and private channels within your company workspace',
      'Direct and group messages with threads',
      'Mentions, reactions, attachments, and pinned items',
    ],
  },
  {
    id: 'projects',
    title: 'Projects and task management',
    problem: 'Delivery status lives in spreadsheets while conversation lives elsewhere.',
    benefit:
      'Run projects with members, status tracking, and tasks in list or board views — linked to chat and files.',
    points: [
      'Project lists, details, members, and status',
      'Tasks with assignees, priority, due dates, comments, and checklists',
      'List and board views for day-to-day execution',
    ],
  },
  {
    id: 'clients',
    title: 'Client portals and collaboration',
    problem: 'Clients need progress updates without seeing internal discussion.',
    benefit:
      'Invite clients into shared channels, onboarding checklists, and client-visible tasks only.',
    points: [
      'External client access with scoped visibility',
      'Onboarding checklists, document requests, and shared messages',
      'Client-visible tasks when you choose to share them',
    ],
  },
  {
    id: 'files',
    title: 'File management and sharing',
    problem: 'Delivery files scatter across drives with unclear sharing rules.',
    benefit:
      'Upload and organize files by project or conversation, marked internal-only or client-shared.',
    points: [
      'Upload and attach files to work context',
      'Internal vs shared visibility scopes',
      'Google Drive and OneDrive link attach support',
    ],
  },
  {
    id: 'approvals',
    title: 'Reviews and approvals',
    problem: 'Approval handoffs are slow when feedback is buried in email.',
    benefit:
      'Route delivery reviews through approval workflows so stakeholders can respond in context.',
    points: [
      'Delivery approval respond flows',
      'Clear status for work waiting on review',
      'Keeps decisions connected to the related delivery work',
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications and unread messages',
    problem: 'Teams miss mentions and client replies when alerts are fragmented.',
    benefit:
      'Stay current with in-app notifications for messages and workspace activity that matters.',
    points: [
      'Unread and mention-aware messaging',
      'Notification drawer for recent activity',
      'Optional email notifications when configured',
    ],
  },
  {
    id: 'permissions',
    title: 'Roles and permissions',
    problem: 'Generic tools overshare internal notes with clients.',
    benefit:
      'Enforce role-based access so sensitive screens and records stay limited to the right people.',
    points: [
      'Seeded roles with permission checks in UI and API',
      'Internal vs external content boundaries',
      'Audit logging for sensitive permission and finance actions',
    ],
  },
  {
    id: 'finance',
    title: 'Financial records and invoice visibility',
    problem: 'Invoices and expenses live outside the delivery workspace.',
    benefit:
      'Track invoices, payment status, and expenses for roles that need them — with restricted visibility.',
    points: [
      'Invoices and payment status',
      'Expenses and approval status fields',
      'Finance access limited by role',
    ],
  },
] as const;

export const SOLUTIONS = [
  {
    id: 'agencies',
    title: 'Creative and digital agencies',
    challenge:
      'Account teams juggle client chat, production status, deliverables, and billing across too many tools.',
    capabilities: [
      'Shared client channels without exposing internal planning',
      'Projects and tasks tied to delivery conversations',
      'Files marked for client sharing vs internal use',
      'Role-gated invoices when finance needs visibility',
    ],
    outcome:
      'One workspace for account, production, and client collaboration with clearer handoffs.',
  },
  {
    id: 'photo',
    title: 'Photo editing and post-production teams',
    challenge:
      'High-volume delivery work needs tight coordination between editors, QA, managers, and clients.',
    capabilities: [
      'Task assignment and board views for production queues',
      'Approval flows for review and delivery decisions',
      'Client-visible progress without internal-only notes',
      'File sharing scoped to the engagement',
    ],
    outcome:
      'Faster coordination from brief to delivery while keeping client access controlled.',
  },
  {
    id: 'marketing',
    title: 'Marketing agencies',
    challenge:
      'Campaign work spans briefs, assets, feedback loops, and stakeholder updates.',
    capabilities: [
      'Channels and threads for campaign discussion',
      'Projects and tasks for owners and deadlines',
      'Shared file delivery for approved assets',
      'Onboarding checklists for new client kickoffs',
    ],
    outcome:
      'Less status chasing and fewer misplaced assets across client engagements.',
  },
  {
    id: 'client-service',
    title: 'Client-service businesses',
    challenge:
      'Clients expect a simple place to follow progress without joining every internal tool.',
    capabilities: [
      'Invite-only client portal experience',
      'Shared tasks and messages for external stakeholders',
      'Document requests during onboarding',
      'Permissioned finance views for authorized roles',
    ],
    outcome:
      'A calmer client experience and tighter control over what leaves the internal team.',
  },
  {
    id: 'distributed',
    title: 'Distributed teams',
    challenge:
      'Remote staff and external partners need one source of truth for delivery work.',
    capabilities: [
      'Central chat and notifications',
      'Project membership and task ownership',
      'Shared vs internal file scopes',
      'Audit-friendly sensitive action logging',
    ],
    outcome:
      'Aligned collaboration across locations without flattening permission boundaries.',
  },
] as const;

/**
 * PLACEHOLDER_PRICING — commercial amounts are not published yet.
 * Cards describe packaging intent; CTAs go to demo/contact.
 */
export const PRICING_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    priceLabel: 'Contact us',
    description: 'For small teams rolling out chat, projects, and client sharing.',
    featured: false,
    features: [
      'Team chat, projects, and tasks',
      'File sharing with visibility scopes',
      'Client invites to shared content',
      'Role-based access controls',
      'Email support during rollout',
    ],
    cta: { href: '/contact', label: 'Contact us' },
  },
  {
    id: 'professional',
    name: 'Professional',
    priceLabel: 'Contact us',
    description: 'For growing client-delivery teams that need approvals and finance visibility.',
    featured: true,
    badge: 'Recommended',
    features: [
      'Everything in Starter',
      'Client onboarding workflows',
      'Delivery approval flows',
      'Invoices and expenses for authorized roles',
      'Priority onboarding help',
    ],
    cta: { href: '/book-a-demo', label: 'Book a demo' },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceLabel: 'Talk to sales',
    description: 'For larger organizations with custom rollout and security requirements.',
    featured: false,
    features: [
      'Everything in Professional',
      'Custom workspace configuration',
      'Expanded admin and audit needs',
      'Guided migration and training',
      'Dedicated success contact',
    ],
    cta: { href: '/book-a-demo', label: 'Talk to sales' },
  },
] as const;

export const TEAM_SIZE_OPTIONS = [
  { value: '1-5', label: '1–5 people' },
  { value: '6-15', label: '6–15 people' },
  { value: '16-50', label: '16–50 people' },
  { value: '51-200', label: '51–200 people' },
  { value: '200+', label: '200+ people' },
] as const;

export const USE_CASE_OPTIONS = [
  { value: 'agency', label: 'Creative / digital agency' },
  { value: 'photo-post', label: 'Photo / post-production' },
  { value: 'marketing', label: 'Marketing agency' },
  { value: 'client-service', label: 'Client-service business' },
  { value: 'distributed-team', label: 'Distributed team' },
  { value: 'other', label: 'Other' },
] as const;

export const WORKFLOW_STEPS = [
  {
    title: 'Bring your team',
    description: 'Invite staff, set roles, and open channels for delivery work.',
  },
  {
    title: 'Collaborate with clients',
    description: 'Share updates in a dedicated portal — without exposing internal notes.',
  },
  {
    title: 'Deliver and close',
    description: 'Get approvals, share files, and keep everything organized for the next engagement.',
  },
] as const;

export const HOME_TRUST_PILLS = [
  'Team collaboration',
  'Client portals',
  'File sharing & delivery',
  'Secure & organized',
] as const;

export const HOME_AUDIENCES = [
  'Creative Agencies',
  'Photo Editing Teams',
  'Marketing Agencies',
  'Client Service Businesses',
] as const;

export const HOME_SOLUTION_CARDS = [
  {
    id: 'agencies',
    title: 'Creative Agencies',
    description: 'Keep account, production, and clients aligned in one workspace.',
    tone: 'violet',
  },
  {
    id: 'photo',
    title: 'Photo Editing Teams',
    description: 'Coordinate queues, reviews, and client delivery without tool sprawl.',
    tone: 'blue',
  },
  {
    id: 'marketing',
    title: 'Marketing Agencies',
    description: 'Connect briefs, assets, feedback, and stakeholder updates.',
    tone: 'indigo',
  },
  {
    id: 'client-service',
    title: 'Client Service Businesses',
    description: 'Give clients a calm portal while internal work stays protected.',
    tone: 'slate',
  },
] as const;
