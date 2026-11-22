import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import '@/components/public-booking/public-booking.css';

const studioFont = Sora({
  subsets: ['latin'],
  variable: '--font-studio-booking',
  display: 'swap',
});

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function PublicBookingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`sb-root ${studioFont.variable}`} data-theme="light">
      {children}
    </div>
  );
}
