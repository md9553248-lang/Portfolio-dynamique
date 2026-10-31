import { createHmac } from 'node:crypto';

/**
 * Empreinte non réversible d'une valeur (adresse IP, par exemple), liée à un secret.
 * On ne stocke jamais l'adresse IP brute : l'empreinte suffit pour repérer des abus.
 */
export function hmacHash(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}
