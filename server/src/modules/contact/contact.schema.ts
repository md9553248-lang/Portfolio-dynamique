import { z } from 'zod';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Vrai si le texte contient un caractère de contrôle (hors retours à la ligne autorisés). */
export function hasControlChars(value: string, allowLineBreaks: boolean): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    const isLineBreakOrTab = code === 9 || code === 10 || code === 13;
    if (code < 32 || code === 127) {
      if (allowLineBreaks && isLineBreakOrTab) continue;
      return true;
    }
  }
  return false;
}

const singleLine = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} : ${min} caractères minimum.`)
    .max(max, `${label} : ${max} caractères maximum.`)
    .refine((value) => !hasControlChars(value, false), `${label} : caractères non autorisés.`);

/**
 * Formulaire de contact. `.strict()` refuse tout champ inattendu.
 * `website` est un champ piège (honeypot) invisible pour les humains : s'il est rempli, c'est un robot.
 * Aucun saut de ligne n'est accepté dans le nom, l'e-mail et le sujet (protection contre l'injection d'en-têtes d'e-mail).
 */
export const contactSchema = z
  .object({
    name: singleLine(2, 100, 'Nom'),
    email: singleLine(3, 254, 'Adresse e-mail').regex(EMAIL_PATTERN, 'Adresse e-mail invalide.'),
    subject: singleLine(3, 150, 'Sujet'),
    message: z
      .string()
      .trim()
      .min(10, 'Message : 10 caractères minimum.')
      .max(5000, 'Message : 5000 caractères maximum.')
      .refine((value) => !hasControlChars(value, true), 'Message : caractères non autorisés.'),
    website: z.string().max(200, 'Champ non autorisé.').optional(),
  })
  .strict();

export type ContactInput = z.infer<typeof contactSchema>;
