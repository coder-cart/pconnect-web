'use client';

import { FormEvent, useEffect, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { STRIPE_PUBLISHABLE_KEY } from '@/lib/config';

interface PayInvoiceModalProps {
  invoiceId: string | null;
  invoiceNumber?: string;
  onClose: () => void;
  onPaid: () => void;
}

interface IntentResponse {
  clientSecret: string;
  amount: string;
  currency: string;
}

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!STRIPE_PUBLISHABLE_KEY) {
    return null;
  }
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
}

function PaymentForm({
  amount,
  currency,
  onPaid,
}: {
  amount: string;
  currency: string;
  onPaid: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message ?? 'Payment failed');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    onPaid();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <p className="text-sm text-[var(--muted)]">
        Amount due:{' '}
        <span className="font-semibold text-[var(--foreground)]">
          {currency} {amount}
        </span>
      </p>
      <PaymentElement />
      {errorMessage ? (
        <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
      ) : null}
      <Button type="submit" disabled={!stripe || isSubmitting}>
        {isSubmitting ? 'Processing...' : `Pay ${currency} ${amount}`}
      </Button>
    </form>
  );
}

export function PayInvoiceModal({
  invoiceId,
  invoiceNumber,
  onClose,
  onPaid,
}: PayInvoiceModalProps) {
  const [intent, setIntent] = useState<IntentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) {
      setIntent(null);
      setErrorMessage(null);
      return;
    }

    if (!STRIPE_PUBLISHABLE_KEY) {
      setErrorMessage(
        'Online payments are not configured. Please contact the studio to pay this invoice.',
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    apiRequest<ApiResponse<IntentResponse>>('/payments/intent', {
      method: 'POST',
      body: JSON.stringify({ invoiceId }),
    })
      .then((response) => setIntent(response.data))
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }, [invoiceId]);

  const stripe = getStripe();

  return (
    <Modal
      open={Boolean(invoiceId)}
      title={`Pay invoice ${invoiceNumber ?? ''}`.trim()}
      description="Securely pay the outstanding balance with a card."
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {isLoading ? (
        <p className="text-sm text-[var(--muted)]">Preparing secure checkout...</p>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
      ) : null}

      {intent && stripe ? (
        <Elements
          stripe={stripe}
          options={{ clientSecret: intent.clientSecret }}
        >
          <PaymentForm
            amount={intent.amount}
            currency={intent.currency}
            onPaid={onPaid}
          />
        </Elements>
      ) : null}
    </Modal>
  );
}
