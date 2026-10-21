'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { NAV_LINKS } from '@/lib/marketing/site';

export function MarketingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const isHome = pathname === '/';

  return (
    <header className={isHome ? 'mk-header mk-header--dark' : 'mk-header'}>
      <div className="mk-shell mk-header__inner">
        <Link href="/" className="mk-header__brand" aria-label="Colabdeck home">
          <Logo />
        </Link>

        <nav className="mk-header__nav" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname === link.href
                  ? 'mk-header__link mk-header__link--active'
                  : 'mk-header__link'
              }
              aria-current={pathname === link.href ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mk-header__actions">
          <Link href="/login" className="mk-link-quiet">
            Sign in
          </Link>
          <Link href="/book-a-demo" className="mk-btn mk-btn--sm">
            Book a demo
          </Link>
          <button
            type="button"
            className="mk-header__menu"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div id={menuId} className="mk-header__drawer">
          <nav aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="mk-header__drawer-link">
                {link.label}
              </Link>
            ))}
            <Link href="/login" className="mk-header__drawer-link">
              Sign in
            </Link>
          </nav>
          <Link href="/book-a-demo" className="mk-btn">
            Book a demo
          </Link>
        </div>
      ) : null}
    </header>
  );
}
