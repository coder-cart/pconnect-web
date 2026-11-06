import { OUTPUT_FORMATS } from '@/lib/orders';

export type OutputFormatCode = (typeof OUTPUT_FORMATS)[number];

const FORMAT_ASSET: Record<OutputFormatCode, string> = {
  JPG: '/orders/output-formats/jpg.svg',
  PNG: '/orders/output-formats/png.svg',
  TIFF: '/orders/output-formats/tiff.svg',
  PSD: '/orders/output-formats/psd.svg',
};

const FALLBACK_ASSET = '/orders/output-formats/jpg.svg';

/** Normalize free-text outputFormat to a known code. */
export function resolveOutputFormat(
  value?: string | null,
): OutputFormatCode {
  const normalized = (value ?? 'JPG').trim().toUpperCase();
  if ((OUTPUT_FORMATS as readonly string[]).includes(normalized)) {
    return normalized as OutputFormatCode;
  }
  if (normalized === 'TIF') return 'TIFF';
  if (normalized === 'JPEG') return 'JPG';
  return 'JPG';
}

/** Image URL for the selected output format (never the source upload). */
export function outputFormatImageSrc(value?: string | null): string {
  const format = resolveOutputFormat(value);
  return FORMAT_ASSET[format] ?? FALLBACK_ASSET;
}

export function outputFormatLabel(value?: string | null): string {
  return resolveOutputFormat(value);
}
