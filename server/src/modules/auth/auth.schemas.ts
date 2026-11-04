import { z } from 'zod';

/** Connexion : on ne juge pas la solidité du mot de passe ici, seulement sa présence et sa taille maximale. */
export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().min(3, 'Adresse e-mail requise.').max(254, 'Adresse e-mail trop longue.'),
    password: z.string().min(1, 'Mot de passe requis.').max(128, 'Mot de passe trop long.'),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mot de passe actuel requis.').max(128, 'Mot de passe trop long.'),
    newPassword: z.string().min(1, 'Nouveau mot de passe requis.').max(128, 'Mot de passe trop long.'),
  })
  .strict();
