const TOKEN_PATTERN = /^[a-f0-9]{32,128}$/i;

function isToken(value: string | null | undefined): value is string {
  return Boolean(value && TOKEN_PATTERN.test(value));
}

/**
 * Email clients such as Gmail sometimes encode "=" so a link arrives as
 * `?token%3D<hex>` instead of `?token=<hex>`. Path tokens avoid that.
 */
export function readEmailLinkToken(
  search: string,
  pathToken?: string | null,
): string {
  if (isToken(pathToken)) {
    return pathToken;
  }

  const raw = search.startsWith('?') ? search.slice(1) : search;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw.replace(/\+/g, '%20'));
  } catch {
    decoded = raw;
  }

  const fromDecoded = decoded.match(/(?:^|&)token=([a-f0-9]+)/i);
  if (isToken(fromDecoded?.[1])) {
    return fromDecoded[1];
  }

  const params = new URLSearchParams(raw);
  const direct = params.get('token');
  if (isToken(direct)) {
    return direct;
  }

  for (const key of params.keys()) {
    const embedded = key.match(/^token=([a-f0-9]+)$/i);
    if (isToken(embedded?.[1])) {
      return embedded[1];
    }
  }

  return '';
}
