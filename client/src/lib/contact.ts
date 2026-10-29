export interface ContactValues {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export type ContactErrors = Partial<Record<keyof ContactValues, string>>;

export const CONTACT_LIMITS = { name: 100, email: 254, subject: 150, message: 5000 } as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validation côté navigateur : un simple confort pour le visiteur.
 * Le serveur revalidera TOUJOURS les mêmes règles (Phase 05), car la validation du navigateur
 * peut être contournée.
 */
export function validateContactForm(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const subject = values.subject.trim();
  const message = values.message.trim();

  if (name.length < 2) errors.name = 'Indiquez votre nom (2 caractères minimum).';
  else if (name.length > CONTACT_LIMITS.name)
    errors.name = `Le nom est trop long (${CONTACT_LIMITS.name} caractères maximum).`;

  if (!EMAIL_PATTERN.test(email) || email.length > CONTACT_LIMITS.email)
    errors.email = 'Saisissez une adresse e-mail valide, par exemple nom@exemple.com.';

  if (subject.length < 3) errors.subject = 'Indiquez un sujet (3 caractères minimum).';
  else if (subject.length > CONTACT_LIMITS.subject)
    errors.subject = `Le sujet est trop long (${CONTACT_LIMITS.subject} caractères maximum).`;

  if (message.length < 10) errors.message = 'Votre message est trop court (10 caractères minimum).';
  else if (message.length > CONTACT_LIMITS.message)
    errors.message = `Le message est trop long (${CONTACT_LIMITS.message} caractères maximum).`;

  return errors;
}
