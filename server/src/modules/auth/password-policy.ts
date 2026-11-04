/** Mots de passe courants (12 caractères ou plus) refusés, en plus des contrôles de longueur. */
const COMMON_PASSWORDS = new Set([
  'password1234',
  'password12345',
  'passwordpassword',
  'motdepasse123',
  'motdepasse1234',
  'azertyuiop12',
  'azertyuiopqsdf',
  'qwertyuiop12',
  'qwertyuiopasdf',
  '123456789012',
  '1234567890123',
  'administrator',
  'administrateur',
  'changemechangeme',
  'iloveyou12345',
  'welcome12345',
  'letmein123456',
  'portfolio1234',
]);

export interface PasswordContext {
  email?: string | undefined;
  displayName?: string | undefined;
}

/** Minuscules et sans accents, pour comparer « Éléonore » et « eleonore ». */
function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function wordsFrom(context: PasswordContext): string[] {
  const sources = [context.email?.split('@')[0] ?? '', context.displayName ?? ''];
  return sources
    .flatMap((source) => normalize(source).split(/[^a-z0-9]+/))
    .filter((word) => word.length >= 4);
}

/**
 * Vérifie la solidité d'un nouveau mot de passe. Renvoie un message d'erreur en français, ou null si le
 * mot de passe est accepté. Les règles privilégient la longueur (une phrase de passe est idéale) plutôt que
 * des contraintes de symboles.
 */
export function validatePasswordStrength(password: string, context: PasswordContext = {}): string | null {
  const characters = [...password];

  if (characters.length < 12) return 'Le mot de passe doit contenir au moins 12 caractères.';
  if (characters.length > 128) return 'Le mot de passe ne doit pas dépasser 128 caractères.';

  const normalized = normalize(password);
  if (COMMON_PASSWORDS.has(normalized)) return 'Ce mot de passe est trop courant.';
  if (new Set(characters).size < 6) return 'Le mot de passe est trop répétitif.';
  if (wordsFrom(context).some((word) => normalized.includes(word))) {
    return 'Le mot de passe ne doit pas contenir votre nom ni votre adresse e-mail.';
  }
  return null;
}
