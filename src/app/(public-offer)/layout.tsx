import type { Metadata } from 'next';
import './photophile-offer.css';

export const metadata: Metadata = {
  title: 'Photophile NHC Offer',
  description: 'Professional photo editing offers from Photophile NHC',
};

export default function PublicOfferLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="photophile-offer-root min-h-screen">{children}</div>
  );
}
