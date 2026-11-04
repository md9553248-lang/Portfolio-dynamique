import { createHash, randomBytes } from 'node:crypto';

/** Jeton de session : 32 octets aléatoires (256 bits), encodés en 43 caractères. */
export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Seule l'empreinte du jeton est stockée en base : une fuite de la base ne donne aucune session valide. */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** Rejette tout de suite un cookie mal formé, sans interroger la base. */
export function isWellFormedToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

/** Lit l'en-tête Cookie. En cas de doublon, la première valeur gagne. */
export function parseCookies(header: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!header) return cookies;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    let value = part.slice(separator + 1).trim();
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) value = value.slice(1, -1);
    try {
      value = decodeURIComponent(value);
    } catch {
      continue;
    }
    if (!cookies.has(name)) cookies.set(name, value);
  }
  return cookies;
}

export function readSessionToken(header: string | undefined, cookieName: string): string | null {
  return parseCookies(header).get(cookieName) ?? null;
}
