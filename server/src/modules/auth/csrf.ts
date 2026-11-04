import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Jeton CSRF lié à la session : HMAC du jeton de session avec un secret du serveur.
 * Le navigateur le reçoit dans la réponse de connexion et le renvoie dans l'en-tête X-CSRF-Token.
 * Un site tiers ne peut ni le lire ni le deviner.
 */
export function computeCsrfToken(csrfSecret: string, sessionToken: string): string {
  return createHmac('sha256', csrfSecret).update(sessionToken).digest('base64url');
}

/** Comparaison en temps constant (évite de deviner le jeton par mesure du temps de réponse). */
export function verifyCsrfToken(
  csrfSecret: string,
  sessionToken: string,
  provided: string | undefined,
): boolean {
  if (!provided) return false;
  const expected = Buffer.from(computeCsrfToken(csrfSecret, sessionToken));
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
