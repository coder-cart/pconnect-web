import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Colabdeck',
  description: 'Colabdeck workspace for chat, projects, files, and finance',
  openGraph: {
    title: 'Colabdeck',
    description: 'Colabdeck workspace for chat, projects, files, and finance',
    images: [
      {
        url: '/brand/colabdeck-og.png',
        width: 1200,
        height: 630,
        alt: 'Colabdeck',
      },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3d3adf' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1115' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
