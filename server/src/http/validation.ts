import type { ZodType } from 'zod';
import { ValidationError } from './errors.js';

/**
 * Valide des données avec un schéma Zod. En cas d'échec, lève une ValidationError (HTTP 400)
 * avec un message par champ. Les valeurs reçues ne sont JAMAIS recopiées dans la réponse.
 */
export function parseOrThrow<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_form';
    if (key in fields) continue;

    switch (issue.code) {
      case 'invalid_type':
        fields[key] = 'Valeur manquante ou de type incorrect.';
        break;
      case 'invalid_value':
        fields[key] = 'Valeur non autorisée.';
        break;
      case 'unrecognized_keys':
        fields[key] = 'Champ non autorisé.';
        break;
      default:
        // Les messages des schémas sont écrits en français (min, max, format...).
        fields[key] = issue.message;
    }
  }
  throw new ValidationError(fields);
}
