'use client';

import { FormEvent, useState } from 'react';
import { z } from 'zod';
import { API_BASE_URL } from '@/lib/config';
import {
  TEAM_SIZE_OPTIONS,
  USE_CASE_OPTIONS,
} from '@/lib/marketing/content';
import { MARKETING_EMAIL } from '@/lib/marketing/site';

const leadSchema = z.object({
  type: z.enum(['demo', 'contact']),
  fullName: z.string().trim().min(2, 'Enter your full name').max(120),
  workEmail: z.string().trim().email('Enter a valid work email').max(254),
  companyName: z.string().trim().min(2, 'Enter your company name').max(160),
  companyWebsite: z.string().trim().max(300).optional().or(z.literal('')),
  teamSize: z
    .enum(['1-5', '6-15', '16-50', '51-200', '200+'])
    .optional()
    .or(z.literal('')),
  useCase: z
    .enum([
      'agency',
      'photo-post',
      'marketing',
      'client-service',
      'distributed-team',
      'other',
    ])
    .optional()
    .or(z.literal('')),
  message: z.string().trim().max(4000).optional().or(z.literal('')),
  website: z.string().max(100).optional(),
});

type LeadFormProps = {
  type: 'demo' | 'contact';
  submitLabel?: string;
  showExtras?: boolean;
};

type FieldErrors = Partial<Record<keyof z.infer<typeof leadSchema>, string>>;

export function LeadForm({
  type,
  submitLabel = 'Submit',
  showExtras = true,
}: LeadFormProps) {
  const [fullName, setFullName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [useCase, setUseCase] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const parsed = leadSchema.safeParse({
      type,
      fullName,
      workEmail,
      companyName,
      companyWebsite,
      teamSize: teamSize || undefined,
      useCase: useCase || undefined,
      message,
      website: honeypot,
    });

    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !nextErrors[key as keyof FieldErrors]) {
          nextErrors[key as keyof FieldErrors] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const payload = {
        type: parsed.data.type,
        fullName: parsed.data.fullName,
        workEmail: parsed.data.workEmail,
        companyName: parsed.data.companyName,
        companyWebsite: parsed.data.companyWebsite || undefined,
        teamSize: parsed.data.teamSize || undefined,
        useCase: parsed.data.useCase || undefined,
        message: parsed.data.message || undefined,
        website: parsed.data.website || undefined,
      };

      const response = await fetch(`${API_BASE_URL}/marketing/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
        errors?: string[];
      } | null;

      if (!response.ok || !body?.success) {
        const messageFromApi =
          body?.message ||
          body?.errors?.[0] ||
          `Unable to submit right now. Email ${MARKETING_EMAIL}.`;
        setFormError(messageFromApi);
        return;
      }

      setSuccessMessage(
        'Thanks — your request was received. Our team will follow up by email shortly.',
      );
      setFullName('');
      setWorkEmail('');
      setCompanyName('');
      setCompanyWebsite('');
      setTeamSize('');
      setUseCase('');
      setMessage('');
      setHoneypot('');
    } catch {
      setFormError(
        `Network error. Please try again or email ${MARKETING_EMAIL}.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mk-form" onSubmit={handleSubmit} noValidate>
      <div className="mk-form__row">
        <label className="mk-field">
          <span>
            Full name <abbr title="required">*</abbr>
          </span>
          <input
            name="fullName"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            aria-invalid={Boolean(fieldErrors.fullName)}
            aria-describedby={fieldErrors.fullName ? 'err-fullName' : undefined}
            required
          />
          {fieldErrors.fullName ? (
            <span id="err-fullName" className="mk-field__error" role="alert">
              {fieldErrors.fullName}
            </span>
          ) : null}
        </label>

        <label className="mk-field">
          <span>
            Work email <abbr title="required">*</abbr>
          </span>
          <input
            type="email"
            name="workEmail"
            autoComplete="email"
            value={workEmail}
            onChange={(event) => setWorkEmail(event.target.value)}
            aria-invalid={Boolean(fieldErrors.workEmail)}
            aria-describedby={fieldErrors.workEmail ? 'err-workEmail' : undefined}
            required
          />
          {fieldErrors.workEmail ? (
            <span id="err-workEmail" className="mk-field__error" role="alert">
              {fieldErrors.workEmail}
            </span>
          ) : null}
        </label>
      </div>

      <label className="mk-field">
        <span>
          Company name <abbr title="required">*</abbr>
        </span>
        <input
          name="companyName"
          autoComplete="organization"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          aria-invalid={Boolean(fieldErrors.companyName)}
          aria-describedby={
            fieldErrors.companyName ? 'err-companyName' : undefined
          }
          required
        />
        {fieldErrors.companyName ? (
          <span id="err-companyName" className="mk-field__error" role="alert">
            {fieldErrors.companyName}
          </span>
        ) : null}
      </label>

      {showExtras ? (
        <>
          <label className="mk-field">
            <span>Company website</span>
            <input
              name="companyWebsite"
              autoComplete="url"
              placeholder="https://"
              value={companyWebsite}
              onChange={(event) => setCompanyWebsite(event.target.value)}
            />
          </label>

          <div className="mk-form__row">
            <label className="mk-field">
              <span>Team size</span>
              <select
                name="teamSize"
                value={teamSize}
                onChange={(event) => setTeamSize(event.target.value)}
              >
                <option value="">Select…</option>
                {TEAM_SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mk-field">
              <span>Primary use case</span>
              <select
                name="useCase"
                value={useCase}
                onChange={(event) => setUseCase(event.target.value)}
              >
                <option value="">Select…</option>
                {USE_CASE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      ) : null}

      <label className="mk-field">
        <span>{type === 'demo' ? 'Additional details' : 'How can we help?'}</span>
        <textarea
          name="message"
          rows={4}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={
            type === 'demo'
              ? 'Team size, must-have modules, timeline…'
              : 'Tell us what you need'
          }
        />
      </label>

      <div className="mk-hp" aria-hidden="true">
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </label>
      </div>

      <p className="mk-form__privacy">
        By submitting, you agree we may contact you about Colabdeck. See our{' '}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      {formError ? (
        <p className="mk-form__status mk-form__status--error" role="alert">
          {formError}
        </p>
      ) : null}
      {successMessage ? (
        <p className="mk-form__status mk-form__status--success" role="status">
          {successMessage}
        </p>
      ) : null}

      <button type="submit" className="mk-btn" disabled={isSubmitting}>
        {isSubmitting ? 'Sending…' : submitLabel}
      </button>
    </form>
  );
}
