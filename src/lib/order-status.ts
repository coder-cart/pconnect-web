export interface StatusMetadata {
  color?: string;
  allowedNextCodes?: string[];
  isTerminal?: boolean;
  legacyStatus?: string;
}

export interface MasterDataStatus {
  id: string;
  name: string;
  code: string;
  metadata?: StatusMetadata | Record<string, unknown> | null;
}

export function statusColor(
  status?: { metadata?: StatusMetadata | null } | null,
  fallback = '#F2F2F2',
): string {
  const raw = status?.metadata?.color;
  if (typeof raw !== 'string' || raw.length === 0) return fallback;
  return raw.startsWith('#') ? raw : `#${raw}`;
}

/** Readable text color on Excel-style status fills. */
export function contrastOnColor(hex: string): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return '#1a1a1a';
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1a1a1a' : '#ffffff';
}

export function statusFillStyle(
  status?: { metadata?: StatusMetadata | null } | null,
): { backgroundColor: string; color: string } {
  const backgroundColor = statusColor(status);
  return {
    backgroundColor,
    color: contrastOnColor(backgroundColor),
  };
}

export function parseStatusMetadata(metadata: unknown): StatusMetadata {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }
  return metadata as StatusMetadata;
}

export function computeOrderCost(input: {
  outFileCount?: number | null;
  artistRatePerImage?: number | string | null;
  extraServiceCount?: number | null;
  extraUnitCost?: number;
}): number | null {
  const outFiles = input.outFileCount ?? 0;
  const rate = input.artistRatePerImage ? Number(input.artistRatePerImage) : 0;

  if (!outFiles || !rate) {
    return input.extraServiceCount
      ? (input.extraServiceCount ?? 0) * (input.extraUnitCost ?? 0)
      : null;
  }

  const base = outFiles * rate;
  const extra = (input.extraServiceCount ?? 0) * (input.extraUnitCost ?? 0);
  return Math.round((base + extra) * 100) / 100;
}

export function allowedWorkflowStatuses(
  all: MasterDataStatus[],
  currentCode?: string | null,
): MasterDataStatus[] {
  if (!currentCode) {
    return all;
  }

  const current = all.find((status) => status.code === currentCode);
  if (!current) {
    return all;
  }

  const allowed = parseStatusMetadata(current.metadata).allowedNextCodes ?? [];
  const options = all.filter(
    (status) => status.id === current.id || allowed.includes(status.code),
  );
  return options.length > 0 ? options : all;
}
