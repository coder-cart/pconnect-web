import Link from 'next/link';
import { SITE_NAME } from '@/lib/marketing/site';

export function BuiltByColabdeck() {
  return (
    <p className="sb-attr">
      Built by <Link href="/">{SITE_NAME}</Link>
    </p>
  );
}
