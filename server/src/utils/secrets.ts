import { createHmac } from 'node:crypto';

/**
 * Dérive un secret distinct par usage à partir du secret principal (SESSION_SECRET).
 * Ainsi, la fuite d'une clé dérivée (ex. celle des empreintes d'IP) ne révèle pas les autres.
 */
export function deriveSecret(secret: string, purpose: string): string {
  return createHmac('sha256', secret).update(`portfolio:${purpose}:v1`).digest('hex');
}
