import { z } from 'zod';

/** Valeurs d'exemple interdites en production (copiées depuis .env.example). */
const PLACEHOLDER_PATTERN = /change[-_ ]?me/i;

const PRODUCTION_REQUIRED_KEYS = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'SESSION_SECRET',
] as const;

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),

    DB_HOST: z.string().min(1).optional(),
    DB_PORT: z.coerce.number().int().min(1).max(65535).optional(),
    DB_NAME: z.string().min(1).optional(),
    DB_USER: z.string().min(1).optional(),
    DB_PASSWORD: z.string().min(1).optional(),

    SESSION_SECRET: z.string().min(32).optional(),

    STORAGE_DRIVER: z.enum(['local']).default('local'),
    STORAGE_LOCAL_PATH: z.string().min(1).default('./storage'),
    CV_MAX_SIZE_MB: z.coerce.number().positive().max(50).default(5),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;

    for (const key of PRODUCTION_REQUIRED_KEYS) {
      if (env[key] === undefined) {
        ctx.addIssue({ code: 'custom', path: [key], message: 'obligatoire en production' });
      }
    }
    if (env.DB_USER === 'root') {
      ctx.addIssue({
        code: 'custom',
        path: ['DB_USER'],
        message: 'le compte "root" est interdit, utilisez un utilisateur dédié',
      });
    }
    if (env.DB_PASSWORD && PLACEHOLDER_PATTERN.test(env.DB_PASSWORD)) {
      ctx.addIssue({
        code: 'custom',
        path: ['DB_PASSWORD'],
        message: "valeur d'exemple détectée, définissez un vrai mot de passe",
      });
    }
    if (env.SESSION_SECRET && PLACEHOLDER_PATTERN.test(env.SESSION_SECRET)) {
      ctx.addIssue({
        code: 'custom',
        path: ['SESSION_SECRET'],
        message: "valeur d'exemple détectée, générez un vrai secret aléatoire",
      });
    }
    if (new URL(env.CLIENT_ORIGIN).protocol !== 'https:') {
      ctx.addIssue({
        code: 'custom',
        path: ['CLIENT_ORIGIN'],
        message: 'https est obligatoire en production',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Valide les variables d'environnement.
 * Le message d'erreur liste uniquement les NOMS des variables fautives, jamais leurs valeurs
 * (elles peuvent contenir des secrets).
 */
export function parseEnv(raw: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `- ${issue.path.join('.') || '(général)'} : ${issue.message}`)
      .join('\n');
    throw new ConfigError(`Configuration invalide. Variables à corriger :\n${details}`);
  }
  return result.data;
}
