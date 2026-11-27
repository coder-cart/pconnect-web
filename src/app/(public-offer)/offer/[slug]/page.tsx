'use client';

import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Check, ChevronDown, Trash2, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { API_BASE_URL } from '@/lib/config';
import { OUTPUT_FORMATS, isHiddenOrderService } from '@/lib/orders';

interface OfferService {
  id: string;
  name: string;
  code: string;
  category: string | null;
  description: string | null;
  unit: string;
  unitPrice: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  isQuoteOnly: boolean;
  campaignDiscountEligible?: boolean;
  tiers: Array<{ minQty: number; maxQty: number | null; unitPrice: number }>;
}

function getServiceListUnitPrice(service: OfferService): number {
  if (service.isQuoteOnly) return 0;
  if (service.minPrice != null && service.minPrice > 0) return service.minPrice;
  return service.unitPrice;
}

function formatServicePriceLabel(
  service: OfferService,
  currency: string,
): string {
  if (service.isQuoteOnly) return 'quote on request';
  const min =
    service.minPrice != null && service.minPrice > 0
      ? service.minPrice
      : service.unitPrice;
  const max =
    service.maxPrice != null && service.maxPrice > 0
      ? service.maxPrice
      : null;
  const unit = service.unit.toLowerCase().replace(/^per\s+/i, '');
  const openEnded =
    service.minPrice != null &&
    service.minPrice > 0 &&
    (service.maxPrice == null || service.maxPrice <= 0);
  if (max != null && min > 0 && max > min) {
    return `${currency} ${min.toFixed(2)} – ${max.toFixed(2)} / ${unit}`;
  }
  if (min > 0) {
    return `${openEnded ? 'from ' : ''}${currency} ${min.toFixed(2)} / ${unit}`;
  }
  return 'quote on request';
}

interface OfferCampaign {
  slug: string;
  status: string;
  available: boolean;
  message: string | null;
  publicTitle: string;
  publicDescription: string;
  heroEyebrow: string | null;
  heroHeadline: string | null;
  heroSubheadline: string | null;
  ctaPrimaryLabel: string;
  ctaSecondaryLabel: string;
  termsAndConditions: string | null;
  currency: string;
  discountValue: number;
  requiresCouponCode: boolean;
  endsAt: string;
  services: OfferService[];
}

interface QuoteLineResult {
  serviceId: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  discountAmount: number;
  lineFinal: number;
  isQuoteOnly?: boolean;
}

interface QuoteResult {
  originalSubtotal: number;
  discountAmount: number;
  discountPercent: number | null;
  finalTotal: number;
  currency: string;
  lines: QuoteLineResult[];
  excludedLines?: QuoteLineResult[];
}

type OfferDropdownOption = {
  id: string;
  name: string;
  unitPrice: number;
  discountedUnitPrice: number | null;
  currency: string;
  unit: string;
  isQuoteOnly: boolean;
};

function formatMoney(currency: string, amount: number): string {
  return `${currency} ${amount.toFixed(2)}`;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs font-medium text-red-600">
      {message}
    </p>
  );
}

function applyCampaignDiscount(
  unitPrice: number,
  discountPercent: number,
  eligible: boolean,
): number | null {
  if (!eligible || unitPrice <= 0 || discountPercent <= 0) return null;
  return Math.round(unitPrice * (1 - discountPercent / 100) * 100) / 100;
}

interface WorkLineDraft {
  key: string;
  serviceIds: string[];
  inFileCount: string;
}

async function publicOfferFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/public/offers/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || 'Request failed');
  }
  return (payload.data ?? payload) as T;
}

function emptyWorkLine(): WorkLineDraft {
  return {
    key: `line-${Math.random().toString(36).slice(2, 9)}`,
    serviceIds: [],
    inFileCount: '',
  };
}

function PhotophileLogo({ large = false }: { large?: boolean }) {
  return (
    <img
      src="/brands/photophile-nhc/logo.png"
      alt="Photophile NHC — Your Trusted Editing Partner"
      className={large ? 'ph-logo ph-logo-lg mx-auto' : 'ph-logo'}
    />
  );
}

function OfferServiceDropdown({
  value,
  options,
  onChange,
}: {
  value: string[];
  options: OfferDropdownOption[];
  onChange: (serviceIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => new Set(value), [value]);
  const selectedOptions = options.filter((option) => selected.has(option.id));
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) =>
      option.name.toLowerCase().includes(term),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function toggle(serviceId: string) {
    if (selected.has(serviceId)) {
      onChange(value.filter((id) => id !== serviceId));
      return;
    }
    onChange([...value, serviceId]);
  }

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-left text-sm text-[#111827] focus:border-[#4154b3] focus:outline-none focus:ring-2 focus:ring-[#4154b3]/30"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {selectedOptions.length === 0 ? (
            <span className="text-[#9ca3af]">Select one or more services…</span>
          ) : selectedOptions.length > 2 ? (
            <span className="truncate text-sm font-medium text-[#111827]">
              {selectedOptions[0].name}
              <span className="font-normal text-[#6b7280]">
                {' '}
                +{selectedOptions.length - 1} more
              </span>
            </span>
          ) : (
            selectedOptions.map((option) => (
              <span
                key={option.id}
                className="inline-flex max-w-[11rem] items-center gap-1 rounded-full bg-[#4154b3]/12 px-2 py-0.5 text-xs font-medium text-[#4154b3] sm:max-w-[14rem]"
              >
                <span className="truncate">{option.name}</span>
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`Remove ${option.name}`}
                  className="shrink-0 rounded-full p-0.5 hover:bg-[#4154b3]/20"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggle(option.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </span>
              </span>
            ))
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#6b7280] transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-30 mt-1 max-w-full overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-lg">
          <div className="border-b border-[#e5e7eb] p-2">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search services…"
              className="h-9 w-full rounded-md border border-[#e5e7eb] px-2 text-sm text-[#111827] focus:border-[#4154b3] focus:outline-none"
            />
            <p className="mt-1.5 text-[11px] text-[#6b7280]">
              Click multiple services. Selection stays until you close the list.
            </p>
          </div>
          <ul
            role="listbox"
            aria-multiselectable="true"
            className="max-h-60 overflow-y-auto overscroll-contain p-1"
          >
            {filtered.length === 0 ? (
              <li className="px-2 py-3 text-xs text-[#6b7280]">No matches</li>
            ) : (
              filtered.map((option) => {
                const isSelected = selected.has(option.id);
                const unitLabel = option.unit
                  .toLowerCase()
                  .replace(/^per\s+/i, '');
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => toggle(option.id)}
                      className={`flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-[#f3f4f6] ${
                        isSelected ? 'bg-[#4154b3]/10' : ''
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          isSelected
                            ? 'border-[#4154b3] bg-[#4154b3] text-white'
                            : 'border-[#d1d5db]'
                        }`}
                      >
                        {isSelected ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium leading-snug text-[#111827]">
                          {option.name}
                        </span>
                        {option.isQuoteOnly ? (
                          <span className="mt-0.5 block text-xs text-[#6b7280]">
                            Quote on request
                          </span>
                        ) : (
                          <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                            {option.discountedUnitPrice != null ? (
                              <>
                                <span className="text-[#9ca3af] line-through">
                                  {formatMoney(
                                    option.currency,
                                    option.unitPrice,
                                  )}
                                </span>
                                <span className="font-semibold text-[#4154b3]">
                                  {formatMoney(
                                    option.currency,
                                    option.discountedUnitPrice,
                                  )}{' '}
                                  / {unitLabel}
                                </span>
                              </>
                            ) : (
                              <span className="font-medium text-[#374151]">
                                {formatMoney(option.currency, option.unitPrice)}{' '}
                                / {unitLabel}
                              </span>
                            )}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          <div className="flex items-center justify-between gap-2 border-t border-[#e5e7eb] px-2 py-2">
            <span className="text-xs text-[#6b7280]">
              {value.length} selected
            </span>
            <button
              type="button"
              className="rounded-md bg-[#4154b3] px-3 py-1.5 text-xs font-semibold text-white"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-[#111827]">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs text-[#6b7280]">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0 self-start">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

const inputClassName =
  'h-11 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 text-base text-[#111827] placeholder:text-[#9ca3af] focus:border-[#4154b3] focus:outline-none focus:ring-2 focus:ring-[#4154b3]/30 sm:text-sm';

export default function PublicOfferPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [campaign, setCampaign] = useState<OfferCampaign | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    services?: string;
    consent?: string;
    form?: string;
  }>({});
  const [success, setSuccess] = useState<{
    orderCode: string;
    finalTotal: number;
    currency: string;
  } | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [orderName, setOrderName] = useState('');
  const [priority, setPriority] = useState<'medium' | 'high' | 'urgent'>(
    'medium',
  );
  const [outputFormat, setOutputFormat] = useState('JPG');
  const [sourceLink, setSourceLink] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [workLines, setWorkLines] = useState<WorkLineDraft[]>([emptyWorkLine()]);

  useEffect(() => {
    let cancelled = false;
    publicOfferFetch<OfferCampaign>(slug)
      .then((data) => {
        if (cancelled) return;
        setCampaign(data);
        void publicOfferFetch(`${slug}/events`, {
          method: 'POST',
          body: JSON.stringify({ eventType: 'view' }),
        }).catch(() => undefined);
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const serviceOptions = useMemo((): OfferDropdownOption[] => {
    if (!campaign) return [];
    return campaign.services
      .filter((service) => !isHiddenOrderService(service.code))
      .map((service) => {
        const listPrice = service.unitPrice;
        const discountedUnitPrice = service.isQuoteOnly
          ? null
          : applyCampaignDiscount(
              listPrice,
              campaign.discountValue,
              Boolean(service.campaignDiscountEligible),
            );
        return {
          id: service.id,
          name: service.name,
          unitPrice: listPrice,
          discountedUnitPrice,
          currency: campaign.currency,
          unit: service.unit,
          isQuoteOnly: service.isQuoteOnly,
        };
      });
  }, [campaign]);

  const selectedLines = useMemo(() => {
    const merged = new Map<string, number>();
    for (const line of workLines) {
      const qty = Number(line.inFileCount);
      if (!Number.isFinite(qty) || qty < 1 || line.serviceIds.length === 0) {
        continue;
      }
      for (const serviceId of line.serviceIds) {
        merged.set(serviceId, (merged.get(serviceId) ?? 0) + qty);
      }
    }
    return [...merged.entries()].map(([serviceId, quantity]) => ({
      serviceId,
      quantity,
    }));
  }, [workLines]);

  const totalInFiles = useMemo(
    () => selectedLines.reduce((sum, line) => sum + line.quantity, 0),
    [selectedLines],
  );

  useEffect(() => {
    if (!campaign?.available || selectedLines.length === 0) {
      setQuote(null);
      return;
    }
    const handle = window.setTimeout(() => {
      setQuoteBusy(true);
      publicOfferFetch<QuoteResult>(`${slug}/quote`, {
        method: 'POST',
        body: JSON.stringify({
          lines: selectedLines,
          couponCode: couponCode || undefined,
        }),
      })
        .then(setQuote)
        .catch(() => setQuote(null))
        .finally(() => setQuoteBusy(false));
    }, 280);
    return () => window.clearTimeout(handle);
  }, [campaign?.available, selectedLines, couponCode, slug]);

  function updateWorkLine(key: string, patch: Partial<WorkLineDraft>) {
    setWorkLines((lines) =>
      lines.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function clearFieldError(key: keyof typeof fieldErrors) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!campaign?.available) return;

    const nextErrors: typeof fieldErrors = {};
    if (!fullName.trim()) {
      nextErrors.fullName = 'Full name is required.';
    }
    if (!email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (selectedLines.length === 0) {
      nextErrors.services =
        'Select one or more services and set In Files on at least one line.';
    }
    if (!consentAccepted) {
      nextErrors.consent = 'Please accept the terms to continue.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      const firstKey = (
        ['fullName', 'email', 'services', 'consent'] as const
      ).find((key) => nextErrors[key]);
      if (firstKey) {
        window.requestAnimationFrame(() => {
          document
            .getElementById(`offer-field-${firstKey}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
      return;
    }

    setSubmitBusy(true);
    setFieldErrors({});
    try {
      const result = await publicOfferFetch<{
        orderCode: string;
        finalTotal: number;
        currency: string;
      }>(`${slug}/orders`, {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          companyName: companyName.trim() || undefined,
          phone: phone.trim() || undefined,
          orderName: orderName.trim() || undefined,
          priority,
          outputFormat,
          lines: selectedLines,
          couponCode: couponCode || undefined,
          editingRequirements: clientNotes.trim() || undefined,
          sourceLink: sourceLink.trim() || undefined,
          consentAccepted,
          honeypot,
        }),
      });
      setSuccess({
        orderCode: result.orderCode,
        finalTotal: result.finalTotal,
        currency: result.currency,
      });
    } catch (error) {
      setFieldErrors({
        form: error instanceof Error ? error.message : 'Submit failed',
      });
      window.requestAnimationFrame(() => {
        document
          .getElementById('offer-field-form')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    } finally {
      setSubmitBusy(false);
    }
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <PhotophileLogo large />
        <p className="mt-6 text-[var(--ph-muted)]">{loadError}</p>
      </main>
    );
  }

  if (!campaign) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <PhotophileLogo large />
        <p className="mt-6 text-[var(--ph-muted)]">Loading offer…</p>
      </main>
    );
  }

  if (!campaign.available) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <PhotophileLogo large />
        <h1 className="mt-8 text-3xl">{campaign.publicTitle}</h1>
        <p className="mt-4 text-[var(--ph-muted)]">
          {campaign.message ?? 'This offer is not available right now.'}
        </p>
      </main>
    );
  }

  if (success) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <PhotophileLogo large />
        <h1 className="mt-8 text-3xl">Order received</h1>
        <p className="mt-4 text-[var(--ph-muted)]">
          Reference{' '}
          <strong className="text-[var(--ph-text)]">{success.orderCode}</strong>.
          Estimated total {success.currency} {success.finalTotal.toFixed(2)}. A
          confirmation email is on the way.
        </p>
        <p className="mt-4 text-sm text-[var(--ph-muted)]">
          This order is now in the Photophile workspace under{' '}
          <strong className="text-[var(--ph-text)]">Orders → Order Received</strong>{' '}
          and follows the same production flow as internal orders.
        </p>
      </main>
    );
  }

  return (
    <main>
      <header className="border-b border-[var(--ph-line)] bg-[rgba(11,12,16,0.88)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <a href="https://photophilenhc.com/" target="_blank" rel="noreferrer">
            <PhotophileLogo />
          </a>
          <p className="hidden text-xs uppercase tracking-[0.18em] text-[var(--ph-muted)] sm:block">
            Your trusted editing partner
          </p>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[var(--ph-line)]">
        <div className="ph-glow pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_70%_40%,rgba(65,84,179,0.28),transparent_55%)]" />
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:gap-10 sm:px-6 sm:py-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="ph-animate-in">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ph-accent-bright)]">
              {campaign.heroEyebrow ?? 'Limited offer'}
            </p>
            <h1 className="mt-4 max-w-xl text-3xl leading-tight sm:text-4xl md:text-5xl">
              {campaign.heroHeadline ?? campaign.publicTitle}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-[var(--ph-muted)]">
              {campaign.heroSubheadline ?? campaign.publicDescription}
            </p>
            <div className="ph-hero-actions mt-8 flex flex-wrap gap-3">
              <a href="#order-form" className="ph-btn-primary">
                {campaign.ctaPrimaryLabel}
              </a>
              <a href="#services-preview" className="ph-btn-secondary">
                {campaign.ctaSecondaryLabel}
              </a>
            </div>
          </div>
          <div className="ph-animate-in-delay ph-card p-5 sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--ph-accent-bright)]">
              Save {campaign.discountValue}%
            </p>
            <p className="mt-3 text-2xl font-semibold sm:text-3xl">
              Ends {new Date(campaign.endsAt).toLocaleDateString()}
            </p>
            <p className="mt-3 text-sm text-[var(--ph-muted)]">
              Pick services, enter image count, and submit. Discount is applied
              automatically in the estimate.
            </p>
          </div>
        </div>
      </section>

      <section id="services-preview" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="text-xl sm:text-2xl">Service catalogue</h2>
        <p className="mt-2 text-sm text-[var(--ph-muted)]">
          Public offer services with campaign pricing. Tap Start Your Order to
          select them.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {campaign.services
            .filter((service) => !isHiddenOrderService(service.code))
            .map((service) => {
              const listUnit = getServiceListUnitPrice(service);
              const saleUnit =
                !service.isQuoteOnly && service.campaignDiscountEligible
                  ? applyCampaignDiscount(
                      listUnit,
                      campaign.discountValue,
                      true,
                    )
                  : null;
              const unitLabel = service.unit
                .toLowerCase()
                .replace(/^per\s+/i, '');
              return (
                <div key={service.id} className="ph-card ph-catalogue-card p-4">
                  <div className="flex flex-col gap-2">
                    <p className="ph-catalogue-card-title text-sm font-semibold leading-snug">
                      {service.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {service.campaignDiscountEligible ? (
                        <span className="rounded-full bg-[rgba(65,84,179,0.2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ph-accent-bright)]">
                          {campaign.discountValue}% off
                        </span>
                      ) : null}
                      {service.isQuoteOnly ? (
                        <span className="text-xs text-[var(--ph-muted)]">
                          Quote on request
                        </span>
                      ) : saleUnit != null ? (
                        <span className="text-xs">
                          <span className="text-[var(--ph-muted)] line-through">
                            {formatMoney(campaign.currency, listUnit)}
                          </span>{' '}
                          <span className="font-semibold text-[var(--ph-accent-bright)]">
                            {formatMoney(campaign.currency, saleUnit)} /{' '}
                            {unitLabel}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--ph-muted)]">
                          {formatServicePriceLabel(service, campaign.currency)}
                        </span>
                      )}
                    </div>
                  </div>
                  {service.description ? (
                    <p className="text-xs leading-relaxed text-[var(--ph-muted)]">
                      {service.description}
                    </p>
                  ) : null}
                </div>
              );
            })}
        </div>
      </section>

      <section
        id="order-form"
        className="border-t border-[var(--ph-line)] bg-[rgba(18,20,28,0.72)] px-4 py-12 sm:px-6"
      >
        <form
          onSubmit={onSubmit}
          className="mx-auto grid max-w-6xl gap-6 pb-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]"
        >
          <div className="ph-order-form-surface order-1 min-w-0 rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6">
            <div className="mb-5 border-b border-[#e5e7eb] pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-[#111827]">
                    Create order
                  </h2>
                  <p className="mt-1 text-sm text-[#6b7280]">
                    Set contact, services, output format, and pricing.
                  </p>
                </div>
                <PhotophileLogo />
              </div>
            </div>

            <div className="space-y-6">
              <FormSection
                title="Order basics"
                description="Who the job is for, the output format, and turnaround priority."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label
                    id="offer-field-fullName"
                    className="block space-y-1.5"
                  >
                    <span className="text-sm font-medium text-[#111827]">
                      Full name
                    </span>
                    <input
                      required
                      className={`${inputClassName}${
                        fieldErrors.fullName
                          ? ' border-red-400 focus:border-red-500 focus:ring-red-500/30'
                          : ''
                      }`}
                      value={fullName}
                      aria-invalid={Boolean(fieldErrors.fullName)}
                      onChange={(event) => {
                        setFullName(event.target.value);
                        clearFieldError('fullName');
                      }}
                      onFocus={() => {
                        void publicOfferFetch(`${slug}/events`, {
                          method: 'POST',
                          body: JSON.stringify({ eventType: 'form_start' }),
                        }).catch(() => undefined);
                      }}
                    />
                    <FieldError message={fieldErrors.fullName} />
                  </label>
                  <label id="offer-field-email" className="block space-y-1.5">
                    <span className="text-sm font-medium text-[#111827]">
                      Email
                    </span>
                    <input
                      required
                      type="email"
                      className={`${inputClassName}${
                        fieldErrors.email
                          ? ' border-red-400 focus:border-red-500 focus:ring-red-500/30'
                          : ''
                      }`}
                      value={email}
                      aria-invalid={Boolean(fieldErrors.email)}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        clearFieldError('email');
                      }}
                    />
                    <FieldError message={fieldErrors.email} />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-[#111827]">
                      Company
                    </span>
                    <input
                      className={inputClassName}
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-[#111827]">
                      Phone
                    </span>
                    <input
                      className={inputClassName}
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </label>
                </div>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-[#111827]">
                    Order name
                  </span>
                  <input
                    className={inputClassName}
                    value={orderName}
                    onChange={(event) => setOrderName(event.target.value)}
                    placeholder="e.g. Spring catalog retouch"
                    autoComplete="off"
                  />
                </label>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-[#111827]">
                    Priority
                  </legend>
                  {(
                    [
                      ['medium', 'Standard turnaround'],
                      ['high', 'High priority'],
                      ['urgent', 'Urgent'],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className="flex items-center gap-2 text-sm text-[#111827]"
                    >
                      <input
                        type="radio"
                        name="offer-priority"
                        checked={priority === value}
                        onChange={() => setPriority(value)}
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-[#111827]">
                    Output format
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {OUTPUT_FORMATS.map((format) => (
                      <label
                        key={format}
                        className={`rounded-full border px-3 py-1 text-sm ${
                          outputFormat === format
                            ? 'border-[#4154b3] bg-[#4154b3]/12 font-medium text-[#111827]'
                            : 'border-[#e5e7eb] text-[#6b7280]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="offer-output-format"
                          className="sr-only"
                          checked={outputFormat === format}
                          onChange={() => setOutputFormat(format)}
                        />
                        {format}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-[#111827]">
                    Drive or file link
                  </span>
                  <input
                    type="url"
                    className={inputClassName}
                    value={sourceLink}
                    onChange={(event) => setSourceLink(event.target.value)}
                    placeholder="https://drive.google.com/..."
                  />
                  <span className="text-xs text-[#6b7280]">
                    Share a Drive / Dropbox folder with your files.
                  </span>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-[#111827]">
                    Instructions from client
                  </span>
                  <textarea
                    value={clientNotes}
                    onChange={(event) => setClientNotes(event.target.value)}
                    rows={4}
                    placeholder="Optional instructions or context"
                    className="w-full resize-y rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-base text-[#111827] placeholder:text-[#9ca3af] focus:border-[#4154b3] focus:outline-none focus:ring-2 focus:ring-[#4154b3]/30 sm:text-sm"
                  />
                </label>
              </FormSection>

              <FormSection
                title="Services & files"
                description="1) Choose services  2) Enter how many images  3) Check estimate"
                action={
                  <button
                    type="button"
                    className="h-8 shrink-0 rounded-md border border-[#e5e7eb] bg-white px-3 text-sm font-medium text-[#111827] hover:bg-[#f9fafb]"
                    onClick={() =>
                      setWorkLines((lines) => [...lines, emptyWorkLine()])
                    }
                  >
                    Add line
                  </button>
                }
              >
                {serviceOptions.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[#e5e7eb] px-3 py-2 text-xs text-[#6b7280]">
                    No public offer services are available yet.
                  </p>
                ) : null}

                <div id="offer-field-services" className="space-y-3">
                  {fieldErrors.services ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                      <FieldError message={fieldErrors.services} />
                    </div>
                  ) : null}
                  {workLines.map((line, index) => {
                    const qty = Number(line.inFileCount) || 0;
                    const selectedServices = campaign.services.filter((row) =>
                      line.serviceIds.includes(row.id),
                    );
                    const canRemove = workLines.length > 1;
                    return (
                      <div
                        key={line.key}
                        className={`space-y-3 rounded-lg border bg-white p-3 ${
                          fieldErrors.services
                            ? 'border-red-300'
                            : 'border-[#e5e7eb]'
                        }`}
                      >
                        <label className="block min-w-0 space-y-1.5">
                          <span className="text-xs font-medium text-[#6b7280]">
                            Services
                            {workLines.length > 1 ? ` · line ${index + 1}` : ''}
                          </span>
                          <OfferServiceDropdown
                            value={line.serviceIds}
                            options={serviceOptions}
                            onChange={(ids) => {
                              updateWorkLine(line.key, { serviceIds: ids });
                              clearFieldError('services');
                            }}
                          />
                        </label>
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                          <label className="block min-w-0 space-y-1.5">
                            <span className="text-xs font-medium text-[#6b7280]">
                              How many images?
                            </span>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              className={inputClassName}
                              value={line.inFileCount}
                              placeholder="e.g. 100"
                              onChange={(event) => {
                                updateWorkLine(line.key, {
                                  inFileCount: event.target.value,
                                });
                                clearFieldError('services');
                              }}
                            />
                          </label>
                          {canRemove ? (
                            <button
                              type="button"
                              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#f3f4f6]"
                              aria-label={`Remove line ${index + 1}`}
                              onClick={() =>
                                setWorkLines((lines) =>
                                  lines.filter((row) => row.key !== line.key),
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                        {selectedServices.length > 0 ? (
                          <p className="text-xs text-[#6b7280]">
                            {selectedServices.length} service
                            {selectedServices.length === 1 ? '' : 's'}
                            {qty > 0 ? ` · ${qty} images` : ' · add image count'}
                          </p>
                        ) : (
                          <p className="text-xs text-[#6b7280]">
                            Tap the box above to pick services.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-[#6b7280]">
                  Total In Files: {totalInFiles}
                </p>
              </FormSection>

              {campaign.requiresCouponCode ? (
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-[#111827]">
                    Coupon code
                  </span>
                  <input
                    className={inputClassName}
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value)}
                  />
                </label>
              ) : null}

              <div id="offer-field-consent" className="space-y-1.5">
                <label
                  className={`flex items-start gap-3 text-sm ${
                    fieldErrors.consent ? 'text-red-700' : 'text-[#6b7280]'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0"
                    checked={consentAccepted}
                    aria-invalid={Boolean(fieldErrors.consent)}
                    onChange={(event) => {
                      setConsentAccepted(event.target.checked);
                      clearFieldError('consent');
                    }}
                  />
                  <span className="leading-relaxed">
                    I agree to the campaign terms
                    {campaign.termsAndConditions ? (
                      <>
                        <span className="hidden sm:inline">
                          {`: ${campaign.termsAndConditions.slice(0, 180)}${
                            campaign.termsAndConditions.length > 180 ? '…' : ''
                          }`}
                        </span>
                        <span className="sm:hidden">
                          {' '}
                          ({campaign.discountValue}% off through{' '}
                          {new Date(campaign.endsAt).toLocaleDateString()}).
                        </span>
                      </>
                    ) : (
                      '.'
                    )}
                  </span>
                </label>
                <FieldError message={fieldErrors.consent} />
              </div>

              <input
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                className="hidden"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
              />

              <div
                id="offer-field-form"
                className="space-y-3 border-t border-[#e5e7eb] pt-4"
              >
                {fieldErrors.form ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                    <FieldError message={fieldErrors.form} />
                  </div>
                ) : null}
                <div className="flex flex-wrap justify-end gap-2">
                  <a
                    href="https://photophilenhc.com/"
                    className="inline-flex h-10 items-center rounded-lg border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#111827]"
                  >
                    Cancel
                  </a>
                  <button
                    type="submit"
                    disabled={submitBusy}
                    className="inline-flex h-10 items-center rounded-lg bg-[#4154b3] px-4 text-sm font-semibold text-white hover:bg-[#3647a0] disabled:opacity-60"
                  >
                    {submitBusy ? 'Submitting…' : 'Create order'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <aside className="order-2 h-fit min-w-0 overflow-hidden rounded-2xl border border-[var(--ph-line)] bg-[rgba(26,29,39,0.95)] p-4 text-[var(--ph-text)] sm:p-5 lg:sticky lg:top-6">
            <h3 className="text-lg font-semibold">Estimate</h3>
            <p className="mt-2 text-sm text-[var(--ph-muted)]">
              Updates as you pick services and image count.
            </p>

            {!quote && !quoteBusy ? (
              <p className="mt-4 text-sm text-[var(--ph-muted)]">
                Select services and enter how many images to see prices and your
                30% discount.
              </p>
            ) : null}

            {quoteBusy && !quote ? (
              <p className="mt-6 text-sm text-[var(--ph-muted)]">
                Calculating…
              </p>
            ) : null}

            {quote ? (
              <div className="mt-5 space-y-4">
                <ul className="space-y-3">
                  {[...(quote.lines ?? []), ...(quote.excludedLines ?? [])].map(
                    (line) => {
                      const discountedUnit =
                        line.quantity > 0
                          ? line.lineFinal / line.quantity
                          : line.unitPrice;
                      const hasDiscount = line.discountAmount > 0;
                      return (
                        <li
                          key={`${line.serviceId}-${line.quantity}`}
                          className="rounded-lg border border-[var(--ph-line)] bg-[rgba(18,20,28,0.55)] p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="min-w-0 text-sm font-medium leading-snug">
                              {line.serviceName}
                            </p>
                            <p className="shrink-0 text-sm font-semibold tabular-nums">
                              {formatMoney(quote.currency, line.lineFinal)}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-[var(--ph-muted)]">
                            {line.quantity} ×{' '}
                            {hasDiscount ? (
                              <>
                                <span className="line-through opacity-70">
                                  {formatMoney(quote.currency, line.unitPrice)}
                                </span>{' '}
                                <span className="text-[var(--ph-accent-bright)]">
                                  {formatMoney(quote.currency, discountedUnit)}
                                </span>
                              </>
                            ) : (
                              formatMoney(quote.currency, line.unitPrice)
                            )}
                          </p>
                          {hasDiscount ? (
                            <p className="mt-1 text-xs text-[var(--ph-success)]">
                              Save {formatMoney(quote.currency, line.discountAmount)}
                            </p>
                          ) : null}
                        </li>
                      );
                    },
                  )}
                </ul>

                <dl className="space-y-3 border-t border-[var(--ph-line)] pt-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--ph-muted)]">Subtotal</dt>
                    <dd className="tabular-nums">
                      {formatMoney(quote.currency, quote.originalSubtotal)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--ph-muted)]">
                      Discount
                      {quote.discountPercent != null && quote.discountPercent > 0
                        ? ` (${quote.discountPercent}%)`
                        : ''}
                    </dt>
                    <dd className="tabular-nums text-[var(--ph-success)]">
                      − {formatMoney(quote.currency, quote.discountAmount)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-[var(--ph-line)] pt-3 text-base font-semibold">
                    <dt>Estimated total</dt>
                    <dd className="tabular-nums">
                      {quoteBusy
                        ? '…'
                        : formatMoney(quote.currency, quote.finalTotal)}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </aside>
        </form>
      </section>

      {quote ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--ph-line)] bg-[rgba(11,12,16,0.96)] px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-[var(--ph-muted)]">
                Estimated total
              </p>
              <p className="text-base font-semibold tabular-nums text-[var(--ph-text)]">
                {formatMoney(quote.currency, quote.finalTotal)}
                <span className="ml-2 text-xs font-medium text-[var(--ph-success)]">
                  saved {formatMoney(quote.currency, quote.discountAmount)}
                </span>
              </p>
            </div>
            <a
              href="#offer-field-form"
              className="ph-btn-primary shrink-0 px-4 py-2 text-xs"
            >
              Submit order
            </a>
          </div>
        </div>
      ) : null}

      <footer
        className={`border-t border-[var(--ph-line)] px-4 py-8 text-center text-xs text-[var(--ph-muted)] sm:px-6 ${
          quote ? 'pb-24 lg:pb-8' : ''
        }`}
      >
        <div className="mb-3 flex justify-center">
          <PhotophileLogo />
        </div>
        Photophile NHC LLP · info@photophilenhc.com · +1 740 792 1396
      </footer>
    </main>
  );
}
