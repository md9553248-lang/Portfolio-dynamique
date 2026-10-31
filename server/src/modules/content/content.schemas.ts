import { z } from 'zod';

const locale = z.enum(['fr', 'en']).default('fr');

/** Identifiant d'URL : minuscules, chiffres et tirets (ex. « api-gestion-stock »). */
const slug = z
  .string()
  .max(120, 'Identifiant trop long.')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Identifiant invalide.');

export const localeQuery = z.object({ locale });

export const projectsQuery = z.object({
  locale,
  category: z
    .string()
    .trim()
    .min(1, 'Catégorie vide.')
    .max(80, 'Catégorie trop longue.')
    .optional(),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});

export const slugParams = z.object({ slug });
