'use client';

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Image as ImageIcon,
  Link2,
  MessageSquareText,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { CHAT_ATTACHMENT_SHEET_HISTORY_TOKEN } from '@/lib/chat-navigation';
import { isTouchDevice } from '@/lib/device';
import { positionPanelAboveAnchor } from '@/lib/viewport-menu';

function stripAttachmentSheetHistoryToken() {
  if (typeof window === 'undefined') return;
  const state = window.history.state;
  if (!state || typeof state !== 'object') return;
  if (
    (state as { attachmentSheet?: string }).attachmentSheet !==
    CHAT_ATTACHMENT_SHEET_HISTORY_TOKEN
  ) {
    return;
  }
  const { attachmentSheet: _removed, ...rest } = state as {
    attachmentSheet?: string;
    [key: string]: unknown;
  };
  // Prefer replaceState over history.back() so closing the sheet to open the
  // native photo picker does not cancel the chooser on Android/iOS.
  window.history.replaceState(rest, '');
}

export type AttachmentSheetAction = 'photos' | 'link' | 'annotate';

interface AttachmentActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaEnabled: boolean;
  canAnnotate: boolean;
  annotateDisabled?: boolean;
  onAction: (action: AttachmentSheetAction) => void;
  trigger: ReactNode;
  className?: string;
}

function useSheetLayout() {
  const [useSheet, setUseSheet] = useState(false);

  useEffect(() => {
    function sync() {
      setUseSheet(
        isTouchDevice() || window.matchMedia('(max-width: 1023px)').matches,
      );
    }
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  return useSheet;
}

export function AttachmentActionSheet({
  open,
  onOpenChange,
  mediaEnabled,
  canAnnotate,
  annotateDisabled = false,
  onAction,
  trigger,
  className,
}: AttachmentActionSheetProps) {
  const useSheet = useSheetLayout();
  const titleId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pushedHistoryRef = useRef(false);
  const [menuPos, setMenuPos] = useState({ left: 0, top: 0 });
  const [menuReady, setMenuReady] = useState(false);

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const toggle = useCallback(() => {
    onOpenChange(!open);
  }, [onOpenChange, open]);

  const runAction = useCallback(
    (action: AttachmentSheetAction) => {
      onAction(action);
      close();
    },
    [close, onAction],
  );

  useLayoutEffect(() => {
    if (!open || useSheet || !triggerRef.current) {
      setMenuReady(false);
      return;
    }

    const anchor = triggerRef.current.getBoundingClientRect();
    const menuWidth = Math.max(220, panelRef.current?.offsetWidth ?? 220);
    const menuHeight = panelRef.current?.offsetHeight ?? 220;
    setMenuPos(positionPanelAboveAnchor(anchor, menuWidth, menuHeight));
    setMenuReady(true);
  }, [open, useSheet, mediaEnabled, canAnnotate]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close, open]);

  useEffect(() => {
    if (!open || !useSheet) {
      if (pushedHistoryRef.current) {
        pushedHistoryRef.current = false;
        stripAttachmentSheetHistoryToken();
      }
      return;
    }

    window.history.pushState(
      {
        ...(window.history.state ?? {}),
        attachmentSheet: CHAT_ATTACHMENT_SHEET_HISTORY_TOKEN,
      },
      '',
    );
    pushedHistoryRef.current = true;

    function onPopState() {
      pushedHistoryRef.current = false;
      onOpenChange(false);
    }

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [onOpenChange, open, useSheet]);

  const actions: Array<{
    id: AttachmentSheetAction;
    label: string;
    icon: ReactNode;
    hidden?: boolean;
    disabled?: boolean;
  }> = [
    {
      id: 'photos',
      label: 'Photos & files',
      icon: <ImageIcon className="h-5 w-5" />,
      hidden: !mediaEnabled,
    },
    {
      id: 'link',
      label: 'Add link',
      icon: <Link2 className="h-5 w-5" />,
    },
    {
      id: 'annotate',
      label: 'Annotate image',
      icon: <MessageSquareText className="h-5 w-5" />,
      hidden: !mediaEnabled || !canAnnotate,
      disabled: annotateDisabled,
    },
  ];

  const visibleActions = actions.filter((action) => !action.hidden);

  const menuBody = (
    <ul className="py-1">
      {visibleActions.map((action) => (
        <li key={action.id}>
          <button
            type="button"
            disabled={action.disabled}
            onClick={() => runAction(action.id)}
            className={cn(
              'flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[var(--foreground)] transition-colors',
              'hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-50',
              useSheet && 'min-h-touch',
            )}
          >
            <span className="text-[var(--muted)]">{action.icon}</span>
            {action.label}
          </button>
        </li>
      ))}
    </ul>
  );

  const triggerNode = isValidElement(trigger) ? (
    cloneElement(
      trigger as ReactElement<{
        ref?: Ref<HTMLElement>;
        onClick?: (event: ReactMouseEvent) => void;
      }>,
      {
        ref: (node: HTMLElement | null) => {
          triggerRef.current = node;
        },
        onClick: (event: ReactMouseEvent) => {
          event.preventDefault();
          event.stopPropagation();
          const original = (
            trigger as ReactElement<{
              onClick?: (event: ReactMouseEvent) => void;
            }>
          ).props.onClick;
          original?.(event);
          toggle();
        },
      },
    )
  ) : (
    <button
      type="button"
      ref={triggerRef as Ref<HTMLButtonElement>}
      onClick={toggle}
    >
      {trigger}
    </button>
  );

  const desktopMenu =
    open && !useSheet && typeof document !== 'undefined'
      ? createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[90] cursor-default"
              aria-label="Close attachment menu"
              onClick={close}
            />
            <div
              ref={panelRef}
              role="menu"
              aria-labelledby={titleId}
              className="fixed z-[91] min-w-[220px] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] shadow-lg"
              style={{
                left: menuPos.left,
                top: menuPos.top,
                visibility: menuReady ? 'visible' : 'hidden',
              }}
            >
              <p id={titleId} className="sr-only">
                Attach
              </p>
              {menuBody}
            </div>
          </>,
          document.body,
        )
      : null;

  const sheetMenu =
    open && useSheet && typeof document !== 'undefined'
      ? createPortal(
          <div className="fixed inset-0 z-[100] flex flex-col justify-end">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Dismiss"
              onClick={close}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative z-[1] max-h-[70vh] overflow-y-auto rounded-t-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <p
                  id={titleId}
                  className="text-sm font-semibold text-[var(--foreground)]"
                >
                  Attach
                </p>
                <button
                  type="button"
                  className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:bg-[var(--surface-muted)]"
                  aria-label="Close"
                  onClick={close}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {menuBody}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={cn('relative', className)}>
      {triggerNode}
      {desktopMenu}
      {sheetMenu}
    </div>
  );
}
