'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type InviteMethod = 'temp_password' | 'set_password' | 'magic_link';

const STAFF_ROLES = [
  { value: 'internal_admin', label: 'Admin' },
  { value: 'internal_manager', label: 'Manager' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'qa', label: 'QA Reviewer' },
  { value: 'editor', label: 'Editor' },
];

const INVITE_METHODS: Array<{ value: InviteMethod; label: string; hint: string }> = [
  {
    value: 'temp_password',
    label: 'Email temporary password',
    hint: 'They get a temp password by email and should change it after first login.',
  },
  {
    value: 'set_password',
    label: 'Set password now',
    hint: 'You choose their password. Share it securely; it is not emailed.',
  },
  {
    value: 'magic_link',
    label: 'Send magic login link',
    hint: 'They click a one-time email link to sign in (no password in the invite).',
  },
];

export function CreateUserModal({ open, onClose, onCreated }: CreateUserModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [roleCode, setRoleCode] = useState('editor');
  const [inviteMethod, setInviteMethod] = useState<InviteMethod>('temp_password');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [magicLoginUrl, setMagicLoginUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFullName('');
      setEmail('');
      setRoleCode('editor');
      setInviteMethod('temp_password');
      setPassword('');
      setErrorMessage(null);
      setResultMessage(null);
      setMagicLoginUrl(null);
    }
  }, [open]);

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!fullName.trim() || !email.trim()) return;
    if (inviteMethod === 'set_password' && password.length < 10) {
      setErrorMessage(
        'Password must be at least 10 characters with upper, lower, number, and symbol.',
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setResultMessage(null);
    setMagicLoginUrl(null);

    try {
      const response = await apiRequest<
        ApiResponse<{
          id: string;
          inviteMethod?: string;
          magicLoginUrl?: string;
        }>
      >('/users', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          userType: 'internal',
          roleCode,
          inviteMethod,
          ...(inviteMethod === 'set_password' ? { password } : {}),
        }),
      });

      if (response.data.magicLoginUrl) {
        setMagicLoginUrl(response.data.magicLoginUrl);
        setResultMessage(
          'Staff invited. Magic link emailed (also copy below if SMTP is off).',
        );
      } else if (inviteMethod === 'set_password') {
        setResultMessage(
          'Staff invited. Share the password you set with them securely.',
        );
        onCreated();
        onClose();
        return;
      } else {
        onCreated();
        onClose();
        return;
      }

      onCreated();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to invite staff',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedHint =
    INVITE_METHODS.find((item) => item.value === inviteMethod)?.hint ?? '';

  return (
    <Modal
      open={open}
      title="Invite staff"
      description="Add an editor or other internal teammate."
      onClose={onClose}
      footer={
        magicLoginUrl ? (
          <ModalActions
            onCancel={onClose}
            onSubmit={onClose}
            submitLabel="Done"
          />
        ) : (
          <ModalActions
            onCancel={onClose}
            onSubmit={() => void handleSubmit()}
            submitLabel="Invite staff"
            isSubmitting={isSubmitting}
            disabled={
              !fullName.trim() ||
              !email.trim() ||
              (inviteMethod === 'set_password' && password.length < 10)
            }
          />
        )
      }
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <Input
          label="Full name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
          className="text-base sm:text-sm"
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="text-base sm:text-sm"
        />
        <Select
          label="Role"
          value={roleCode}
          onChange={(event) => setRoleCode(event.target.value)}
          options={STAFF_ROLES}
        />

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-[var(--foreground)]">
            How they sign in
          </legend>
          <div className="space-y-2">
            {INVITE_METHODS.map((method) => (
              <label
                key={method.value}
                className="flex cursor-pointer items-start gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--surface-muted)]"
              >
                <input
                  type="radio"
                  name="inviteMethod"
                  className="mt-1"
                  checked={inviteMethod === method.value}
                  onChange={() => setInviteMethod(method.value)}
                />
                <span>
                  <span className="font-medium text-[var(--foreground)]">
                    {method.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--muted)]">
                    {method.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-[var(--muted)]">{selectedHint}</p>
        </fieldset>

        {inviteMethod === 'set_password' ? (
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="text-base sm:text-sm"
            hint="At least 10 characters with upper, lower, number, and symbol."
          />
        ) : null}

        {errorMessage ? (
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : null}
        {resultMessage ? (
          <p className="text-sm text-[var(--success)]">{resultMessage}</p>
        ) : null}
        {magicLoginUrl ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-3">
            <p className="mb-1 text-xs font-medium text-[var(--foreground)]">
              Magic login link
            </p>
            <p className="break-all text-xs text-[var(--muted)]">{magicLoginUrl}</p>
            <button
              type="button"
              className="mt-2 text-xs font-medium text-[var(--primary)] hover:underline"
              onClick={() => void navigator.clipboard.writeText(magicLoginUrl)}
            >
              Copy link
            </button>
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
