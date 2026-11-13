import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { RegisterServiceWorker } from '@/components/pwa/RegisterServiceWorker';
import { BRAND } from '@/lib/branding';
import { isStagingApp } from '@/lib/app-env';
import { SITE_URL } from '@/lib/marketing/site';
import './globals.css';

const stagingRobots = isStagingApp()
  ? ({
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    } as const)
  : undefined;

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: BRAND.name,
  title: {
    default: isStagingApp() ? `${BRAND.name} (Staging)` : BRAND.name,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
  robots: stagingRobots,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: BRAND.shortName,
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: BRAND.faviconIco, sizes: 'any' },
      { url: BRAND.favicon, sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-48.png', sizes: '48x48', type: 'image/png' },
      { url: BRAND.icon192, sizes: '192x192', type: 'image/png' },
      { url: BRAND.icon512, sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: BRAND.appleTouchIcon, sizes: '180x180', type: 'image/png' },
      { url: '/icons/icon-152.png', sizes: '152x152', type: 'image/png' },
    ],
    shortcut: [{ url: BRAND.favicon, type: 'image/png' }],
  },
  openGraph: {
    title: BRAND.name,
    description: BRAND.description,
    siteName: BRAND.name,
    images: [
      {
        url: BRAND.ogImage,
        width: 1200,
        height: 630,
        alt: BRAND.name,
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: BRAND.name,
    description: BRAND.description,
    images: [BRAND.ogImage],
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  /** Matches app header/sidebar (`--shell-brand`) on Android Chrome + installed PWA. */
  themeColor: BRAND.themeColor,
  colorScheme: 'light dark',
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var stored=localStorage.getItem('pconnect_theme');var theme=stored==='dark'||stored==='light'?stored:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=theme;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full antialiased">
        <ThemeProvider>
          <RegisterServiceWorker />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
