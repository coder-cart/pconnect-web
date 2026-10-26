'use client';

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { AuthenticatedUser } from '@/lib/auth';
import { apiRequest } from '@/lib/api-client';
import {
  TourStep,
  filterAvailableTourSteps,
  getTourStepsForPersona,
  resolveTourPersona,
} from '@/lib/product-tour';
import { ProductTour } from '@/components/tour/ProductTour';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

interface ProductTourContextValue {
  startTour: () => void;
}

const ProductTourContext = createContext<ProductTourContextValue | null>(null);

export function useProductTour() {
  const context = useContext(ProductTourContext);
  if (!context) {
    throw new Error('useProductTour must be used within ProductTourProvider');
  }
  return context;
}

export function ProductTourProvider({
  user,
  children,
}: {
  user: AuthenticatedUser;
  children: ReactNode;
}) {
  const router = useRouter();
  const { refreshUser } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const autoStartedRef = useRef(false);

  const persona = useMemo(() => resolveTourPersona(user), [user]);

  const markComplete = useCallback(async () => {
    try {
      await apiRequest('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ productTourCompleted: true }),
      });
      await refreshUser();
    } catch {
      // Non-blocking
    }
  }, [refreshUser]);

  const startTour = useCallback(() => {
    const personaSteps = getTourStepsForPersona(persona);
    const firstRoute = personaSteps.find((step) => step.route)?.route;
    if (firstRoute) {
      router.push(firstRoute);
    }

    window.setTimeout(() => {
      const available = filterAvailableTourSteps(personaSteps);
      setSteps(available.length > 0 ? available : personaSteps);
      setOpen(true);
    }, firstRoute ? 280 : 80);
  }, [persona, router]);

  useEffect(() => {
    if (autoStartedRef.current) return;
    if (user.mustChangePassword) return;
    if (user.productTourCompletedAt) return;

    autoStartedRef.current = true;
    const timer = window.setTimeout(() => {
      startTour();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [
    user.mustChangePassword,
    user.productTourCompletedAt,
    startTour,
  ]);

  const handleStepChange = useCallback(
    (step: TourStep) => {
      if (step.route) {
        router.push(step.route);
      }
    },
    [router],
  );

  const handleClose = useCallback(
    (completed: boolean) => {
      setOpen(false);
      setSteps([]);
      if (completed) {
        void markComplete();
      }
    },
    [markComplete],
  );

  return (
    <ProductTourContext.Provider value={{ startTour }}>
      {children}
      <ProductTour
        steps={steps}
        open={open}
        onClose={handleClose}
        onStepChange={handleStepChange}
      />
    </ProductTourContext.Provider>
  );
}
