'use client';

import { useParams } from 'next/navigation';
import { OrderDetailView } from '@/components/orders/OrderDetailView';

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  return <OrderDetailView orderId={params.id} />;
}
